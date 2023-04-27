/* eslint no-await-in-loop: 0 */
/* eslint no-empty: 0 */

/**
 * An object describing the options to use when generating a password.
 *
 * @typedef {Object} PasswordGenerationOptions
 * @property {number} passwordLength The length of the password to generate.
 * @property {number} minDigitProportion The minimum proportion fo characters that should be digits,
 *                                       between 0.0 and 1.0.
 * @property {number} minSymbolProportion The minimum proportion fo characters that should be
 *                                        symbols (i.e. not alphanumeric), between 0.0 and 1.0.
 * @property {number} maxCaseVariance The maximum allowed ratio between uppercase and lowercase
 *                                    letters. A value of 0 means there needs to be exactly the same
 *                                    amount of lowercase and uppercase letters, while a value of 1
 *                                    allows for any possible ratio. To allow for up to n times as
 *                                    many lowercase letters than uppercase letters, or vice-versa,
 *                                    set this value to abs((n-1)/(n+1)).
 * @property {boolean} useLowercase Whether or not to include lowercase letters as part of the
 *                                  generated password.
 * @property {boolean} useUppercase Whether or not to include uppercase letters as part of the
 *                                  generated password.
 * @property {boolean} useDigits Whether or not to include digits as part of the generated password.
 * @property {boolean} useSymbols Whether or not to include symbols as part of the generated
 *                                password.
 * @property {string} symbols A string of symbols to generate passwords with for when useSymbols is
 *                            true.
 */

/**
 * The amount of time to spend generating passwords on a worker at a time, in seconds.
 */
const PASSWORD_GENERATION_TIMESTEP = 0.05;

/**
 * Equal to crypto.getRandomValues, or null if unavailable.
 */
const getRandomValues = (() => {
  if (window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues.bind(window.crypto);
  }
  if (window.msCrypto && window.msCrypto.getRandomValues) {
    return window.msCrypto.getRandomValues.bind(window.msCrypto);
  }
  return null;
})();

/**
 * Responsible for generating passwords for a given set of password generation options.
 */
export default class PasswordGeneratorUtil {
  constructor() {
    // Functions to resolve or reject the current password generation request for each worker
    this.resolvePassword = [];
    this.rejectPassword = [];
    // Create a worker for every CPU to generate passwords on
    this.workers = [];
    for (let i = 0; i < (navigator.hardwareConcurrency || 2); i += 1) {
      const worker = new Worker(
        /* webpackChunkName: "generate-password-worker" */ new URL('./generate-password.worker.js', import.meta.url),
      );
      worker.addEventListener('message', (event) => this._handleWorkerMessage(i, event));
      this.workers.push(worker);
      this.resolvePassword.push(null);
      this.rejectPassword.push(null);
    }
    // Whether or not the current password generation request is about to be cancelled
    this.cancelling = false;
    // An array of promises to the password generation requests for each child worker
    this.promises = null;
    // A promise to the current password generation in progress, if any
    this.generatePromise = null;
    // A promise to the current cancellation in progress, if any
    this.cancelPromise = null;
    // An integer incremented for each call to generatePassword(), used to resolving race conditions
    this.latestRequest = 0;
  }

  /**
   * Asynchronously generates a password conforming to the given generation options using web
   * workers. If this method is called more than once before the previous call has finished
   * generating a password, that call will be cancelled.
   *
   * @param {PasswordGenerationOptions} options The options describing the characteristics of the
   *                                            password to generate.
   * @param {number} timeout The maximum amount of time in seconds to wait before giving up
   *                         generating the password.
   * @returns {string} The generated password.
   * @throws {Error} An error of name 'CancelError' if the password generation was cancelled by a
   *                 subsequent call to this method.
   * @throws {Error} An error of name 'TimeoutError' if no password was able to be generated in the
   *                 provided timeout window.
   */
  async generatePassword(options, timeout, request = this.latestRequest + 1) {
    // Increment latestRequest if needed
    if (request > this.latestRequest) {
      this.latestRequest = request;
    }

    // Cancel any current password generation in progress
    if (this.generatePromise !== null) {
      await this._cancel();
      try {
        await this.generatePromise;
      } catch (e) {}
    }

    // Need to check generatePromise again as this method may have been called twice, leading to a
    // race condition where another password generation request has already started at this point
    if (this.generatePromise === null) {
      this.promises = [];
      for (let i = 0; i < this.workers.length; i += 1) {
        this.promises.push(this._generatePasswordOnWorker(options, timeout, i));
      }
      this.generatePromise = (async () => {
        // Start generating passwords on all the workers until we find one, or the timeout is
        // reached
        try {
          const password = await Promise.race(this.promises);
          return password;
        } finally {
          // Ensure that no workers are running before returning
          await this._cancel();
          this.generatePromise = null;
        }
      })();
      return this.generatePromise;
    }

    // If no new calls to generatePassword() have been made, but another password generation request
    // was started, then we have to try starting the request again recursively
    if (this.latestRequest === request) {
      return this.generatePassword(options, timeout, request);
    }

    // Here another call to generatePassword() has superseded this call, so we just throw a
    // CancelError
    const error = new Error();
    error.name = 'CancelError';
    throw error;
  }

  /**
   * Asynchronously generates a password conforming to the given generation options on the given
   * worker. Returns null if a password could not be generated.
   */
  async _generatePasswordOnWorker(options, timeout, workerIndex) {
    // Measure the starting time to keep track of the timeout
    const startTime = Date.now();

    // Keep trying to generate passwords on the worker until we either find one or reach the timeout
    let password = null;
    while (password === null) {
      // Check if we've exceeded our timeout yet
      if (Date.now() - startTime > timeout * 1000) {
        const error = new Error(
          'Password took too long to generate. Try adjusting some of the options to be less '
          + 'restrictive.',
        );
        error.name = 'TimeoutError';
        throw error;
      }

      // Check if the request has been cancelled
      if (this.cancelling) {
        const error = new Error();
        error.name = 'CancelError';
        throw error;
      }

      // Try generating a password on the worker for one time step
      try {
        password = await new Promise((resolve, reject) => {
          this.resolvePassword[workerIndex] = resolve;
          this.rejectPassword[workerIndex] = reject;
          this.workers[workerIndex].postMessage({
            messageType: 'REQUEST_GENERATE_PASSWORD',
            messageData: {
              options,
              timeout: PASSWORD_GENERATION_TIMESTEP,
            },
          });
        });
      } catch (error) {
        // Throw the error if it wasn't due to a timeout
        if (error.name !== 'TimeoutError') {
          throw error;
        }
      } finally {
        // Clear the stored resolve and reject functions for the worker
        this.resolvePassword[workerIndex] = null;
        this.rejectPassword[workerIndex] = null;
      }
    }

    return password;
  }

  /**
   * Cancels the current password generation in progress, if any.
   */
  async _cancel() {
    // Only try to cancel if a cancel isn't already in progress
    if (this.cancelPromise === null) {
      this.cancelPromise = (async () => {
        // Only cancel if there's something running
        if (this.promises !== null) {
          // Cancel all the other workers and wait for them to finish
          this.cancelling = true;
          for (let i = 0; i < this.promises.length; i += 1) {
            try {
              await this.promises[i];
            } catch (e) {}
          }
          this.promises = null;
          this.cancelling = false;
        }
        this.cancelPromise = null;
      })();
    }
    return this.cancelPromise;
  }

  /**
   * Handles messages sent by password generation workers.
   */
  _handleWorkerMessage(workerIndex, event) {
    switch (event.data.messageType) {
      // The worker has provided us with a response to our generation request
      case 'RESPONSE_GENERATE_PASSWORD': {
        if (event.data.responseCode === 'OK') {
          // Password generated successfully
          this.resolvePassword[workerIndex](event.data.messageData.password);
        } else if (event.data.responseCode === 'ERROR') {
          // An unknown error occurred generating the password
          this.rejectPassword[workerIndex](
            new Error(event.data.messageData.message),
          );
        } else if (event.data.responseCode === 'TIMEOUT') {
          // The time step ended without generating a password
          const error = new Error();
          error.name = 'TimeoutError';
          this.rejectPassword[workerIndex](error);
        }
        break;
      }
      // Handle when the worker needs to get some random bytes (since the Web Crypto API isn't
      // available in web workers on all browsers...)
      case 'REQUEST_GET_RANDOM_BYTES': {
        const buffer = new Uint8Array(event.data.messageData.buffer);
        if (getRandomValues === null) {
          // Couldn't generate any random bytes
          this.workers[workerIndex].postMessage(
            {
              messageType: 'RESPONSE_GET_RANDOM_BYTES',
              responseCode: 'ERROR',
              messageData: {
                buffer: buffer.buffer,
                message:
                  'Your browser does not support cryptographically secure random number '
                  + 'generation.',
              },
            },
            [buffer.buffer],
          );
        } else {
          // Generate some random bytes and send them to the worker
          getRandomValues(buffer);
          this.workers[workerIndex].postMessage(
            {
              messageType: 'RESPONSE_GET_RANDOM_BYTES',
              responseCode: 'OK',
              messageData: {
                buffer: buffer.buffer,
              },
            },
            [buffer.buffer],
          );
        }
        break;
      }
      default:
        break;
    }
  }
}
