/* eslint no-await-in-loop: 0 */
/* eslint no-empty: 0 */

/**
 * An object describing the options to use when generating a password.
 *
 * @typedef {Object} PasswordGenerationOptions
 * @property {number} passwordLength The length of the password to generate.
 * @property {number} minDigitProportion The minimum proportion of characters that should
 *   be digits, between 0.0 and 1.0.
 * @property {number} minSymbolProportion The minimum proportion of characters that
 *   should be symbols (i.e. not alphanumeric), between 0.0 and 1.0.
 * @property {number} maxCaseVariance The maximum allowed ratio between uppercase and
 *   lowercase letters. A value of 0 means there needs to be exactly the same amount of
 *   lowercase and uppercase letters, while a value of 1 allows for any possible ratio.
 *   To allow for up to n times as many lowercase letters than uppercase letters, or
 *   vice-versa, set this value to abs((n-1)/(n+1)).
 * @property {boolean} useLowercase Whether or not to include lowercase letters as part
 *   of the generated password.
 * @property {boolean} useUppercase Whether or not to include uppercase letters as part
 *   of the generated password.
 * @property {boolean} useDigits Whether or not to include digits as part of the
 *   generated password.
 * @property {boolean} useSymbols Whether or not to include symbols as part of the
 *   generated password.
 * @property {string} symbols A string of symbols to generate passwords with for when
 *   useSymbols is true.
 */

/**
 * The amount of time to spend generating passwords on a worker at a time, in seconds.
 */
const PASSWORD_GENERATION_TIMESTEP = 0.05;

/**
 * Responsible for generating passwords for a given set of password generation options.
 */
export default class PasswordGeneratorUtil {
  /**
   * An array of web workers responsible for generating passwords.
   * @type {Worker[]}
   * @private
   */
  #workers = [];

  /**
   * A map that associates requestIds with another map that associates workers with their
   * corresponding resolve and reject handlers for ongoing password generation promises.
   * @type {Map<number, Map<Worker, { resolve: Function, reject: Function }>>}
   * @private
   */
  #workerPromiseHandlers = new Map();

  /**
   * A map that associates requestIds with an array of ongoing password generation
   * promises for each worker.
   * @type {Map<number, Promise[]>}
   * @private
   */
  #ongoingWorkerPromises = new Map();

  /**
   * A number representing the current password generation request's id.
   * @type {number}
   * @private
   */
  #currentRequestId = 0;

  /**
   * Constructor for the PasswordGeneratorUtil class. Initializes workers based on the
   * number of CPU cores available.
   */
  constructor() {
    for (let i = 0; i < (navigator.hardwareConcurrency || 2); i += 1) {
      const worker = new Worker(
        new URL('./generate-password.worker.js', import.meta.url),
      );
      // Add a message event listener to handle messages from the worker
      worker.addEventListener(
        'message',
        (event) => this.#handleWorkerMessage(worker, event),
      );

      this.#workers.push(worker);
    }
  }

  /**
   * Asynchronously generates a password conforming to the given generation options using
   * web workers. If this method is called more than once before the previous call has
   * finished generating a password, that call will be cancelled.
   *
   * @param {PasswordGenerationOptions} options The options describing the
   *   characteristics of the password to generate.
   * @param {number} timeout The maximum amount of time in seconds to wait before giving
   *   up generating the password.
   * @returns {string} The generated password.
   * @throws {Error} An error of name 'CancelError' if the password generation was
   *   cancelled by a subsequent call to this method.
   * @throws {Error} An error of name 'TimeoutError' if no password was able to be
   *   generated in the provided timeout window.
   */
  async generatePassword(options, timeout) {
    // Increment the current request ID to identify new requests
    this.#currentRequestId += 1;
    const requestId = this.#currentRequestId;

    // Wait for all previous calls to #generatePasswordOnWorker to finish
    const previousRequestIds = [];
    const previousPromises = [];
    this.#ongoingWorkerPromises.forEach((promises, previousRequestId) => {
      previousPromises.push(...promises);
      previousRequestIds.push(previousRequestId);
    });
    await Promise.allSettled(previousPromises);

    // Remove previous request IDs from the ongoing worker promises map
    previousRequestIds.forEach((previousRequestId) => {
      this.#ongoingWorkerPromises.delete(previousRequestId);
    });

    // Create a new array of promises for each worker to generate passwords
    const promises = this.#workers.map(
      (worker) => this.#generatePasswordOnWorker(worker, options, timeout, requestId),
    );
    this.#ongoingWorkerPromises.set(requestId, promises);

    // Wait for any of the promises to resolve and return the password, or catch and
    // throw errors
    try {
      const password = await Promise.any(promises);
      return password;
    } catch (e) {
      if (e instanceof AggregateError) {
        throw e.errors[0];
      }
      throw e;
    }
  }

  /**
   * Generates a password on the given worker using the specified options and timeout.
   * Continuously generates passwords until a valid one is found or the timeout is
   * reached.
   *
   * @param {Worker} worker The worker to generate the password on.
   * @param {PasswordGenerationOptions} options The options describing the
   *   characteristics of the password to generate.
   * @param {number} timeout The maximum amount of time in seconds to wait before giving
   *   up generating the password.
   * @param {number} requestId An identifier for the current password generation request.
   * @returns {string} The generated password.
   * @throws {Error} An error of name 'CancelError' if the password generation was
   *   cancelled by a subsequent call to this method.
   * @throws {Error} An error of name 'TimeoutError' if no password was able to be
   *   generated in the provided timeout window.
   * @private
   */
  async #generatePasswordOnWorker(worker, options, timeout, requestId) {
    const startTime = performance.now();

    // Keep generating passwords until a valid one is found, or the timeout is reached
    while (performance.now() - startTime <= timeout * 1000) {
      // If the current request ID has changed, throw a CancelError
      if (requestId !== this.#currentRequestId) {
        throw PasswordGeneratorUtil.#createCancelError();
      }

      // Try to generate a password and return it if successful, or catch and handle
      // errors
      try {
        const password = await this.#requestPassword(
          worker,
          options,
          requestId,
        );
        return password;
      } catch (error) {
        if (error.name !== 'TimeoutError') {
          throw error;
        }
      }
    }

    // If the loop has finished without finding a valid password, throw a TimeoutError
    throw PasswordGeneratorUtil.#createTimeoutError();
  }

  /**
   * Handles messages sent by password generation workers. Checks the response code and
   * calls the corresponding resolve or reject handler for the worker and requestId.
   *
   * @param {Worker} worker The worker that sent the message.
   * @param {MessageEvent} event The message event containing data from the worker.
   * @private
   */
  #handleWorkerMessage(worker, event) {
    const { requestId } = event.data.messageData;
    // Get the resolve and reject handlers for the worker and requestId
    const handlers = this.#workerPromiseHandlers.get(requestId)?.get(worker);

    // If no handlers are found, return early
    if (!handlers) {
      return;
    }

    // Call the appropriate handler based on the response code
    if (event.data.responseCode === 'OK') {
      handlers.resolve(event.data.messageData.password);
    } else if (event.data.responseCode === 'ERROR') {
      handlers.reject(new Error(event.data.messageData.message));
    } else if (event.data.responseCode === 'TIMEOUT') {
      handlers.reject(PasswordGeneratorUtil.#createTimeoutError());
    }
  }

  /**
   * Sends a message to the worker to generate a password and returns a promise that
   * resolves with the generated password or rejects with an error. Also handles cleanup
   * of promise handlers for the given requestId and worker after completion.
   *
   * @param {Worker} worker The worker to send the message to.
   * @param {PasswordGenerationOptions} options The options describing the
   *   characteristics of the password to generate.
   * @param {number} requestId An identifier for the current password generation request.
   * @returns {Promise} A promise that resolves with the generated password or rejects
   *   with an error.
   * @private
   */
  async #requestPassword(worker, options, requestId) {
    try {
      // Create a new promise and store its resolve and reject handlers for the worker
      // and requestId
      const result = await new Promise((resolve, reject) => {
        const handlersForRequest = this.#workerPromiseHandlers.get(requestId)
          ?? new Map();
        handlersForRequest.set(worker, { resolve, reject });
        this.#workerPromiseHandlers.set(requestId, handlersForRequest);

        // Send a message to the worker to start generating a password
        worker.postMessage({
          messageType: 'REQUEST_GENERATE_PASSWORD',
          messageData: {
            options,
            requestId,
            timeout: PASSWORD_GENERATION_TIMESTEP,
          },
        });
      });

      return result;
    } finally {
      // Clean up the stored promise handlers for the worker and requestId after
      // completion
      const handlersForRequest = this.#workerPromiseHandlers.get(requestId);
      if (handlersForRequest) {
        handlersForRequest.delete(worker);

        if (handlersForRequest.size === 0) {
          this.#workerPromiseHandlers.delete(requestId);
        }
      }
    }
  }

  /**
   * Creates a CancelError object with a custom error message.
   *
   * @returns {Error} A CancelError object.
   * @private
   */
  static #createCancelError() {
    const error = new Error('Password generation cancelled');
    error.name = 'CancelError';
    return error;
  }

  /**
   * Creates a TimeoutError object with a custom error message.
   *
   * @returns {Error} A TimeoutError object.
   * @private
   */
  static #createTimeoutError() {
    const error = new Error(
      'Password took too long to generate. Try adjusting some of the options to be less restrictive.',
    );
    error.name = 'TimeoutError';
    return error;
  }
}
