/* eslint no-restricted-globals: 0 */
// eslint-disable-next-line spaced-comment
/// <reference path="PasswordGeneratorUtil.js" />

import classifyCharacter from 'util/classifyCharacter';

/**
 * Stores previously randomly generated bytes.
 */
const randomPool = {
  // Cache around 64KiB of random data
  buffer: new Uint8Array(65536),
  // Number of bytes read from the buffer so far (initially max to trigger a call to
  // regenerateRandomPool())
  numRead: 65536,
};

/**
 * Regenerates the buffer of cached random bytes by fetching some new cryptographically
 * secure random bytes.
 */
function regenerateRandomPool() {
  self.crypto.getRandomValues(randomPool.buffer);
  randomPool.numRead = 0;
}

/**
 * Returns a cryptographically secure random byte, which may need to wait for
 * regenerateRandomPool() if the cache of random bytes is empty.
 *
 * @returns {number} A random number in the range [0, 255] inclusive.
 */
function getRandomByte() {
  // Check if we've run out of random bytes, and regenerate the random buffer if we have
  if (randomPool.numRead >= randomPool.buffer.length) {
    regenerateRandomPool();
  }

  const randomByte = randomPool.buffer[randomPool.numRead];
  randomPool.numRead += 1;
  return randomByte;
}

/**
 * Generates a cryptographically secure random byte in the given range. All random
 * numbers returned are uniform in distribution, using an algorithm similar to OpenJDK's
 * Random.nextInt() method to ensure uniformity.
 *
 * @param {number} min The inclusive lower bound of the range, between 0 and 255
 *   inclusive.
 * @param {number} max The inclusive upper bound of the range, between 0 and 255
 *   inclusive, and greater than min.
 * @returns {number} A random number in the range [min, max] inclusive.
 */
function getRandomByteInRange(min, max) {
  const bound = max - min + 1;
  let randomUint8 = 0;
  do {
    randomUint8 = getRandomByte();
  } while (randomUint8 > Math.floor((0xff + 1) / bound) * bound - 1);
  return (randomUint8 % bound) + min;
}

/**
 * Determines if the given randomly generated password is valid according to the provided
 * password generation options.
 *
 * @param {string} password The password to validate.
 * @param {PasswordGenerationOptions} options The options describing the characteristics
 *   that the password must have.
 * @returns {boolean} true if the password meets the requirements specified in the given
 *   options, and false otherwise.
 */
function passwordIsValid(password, options) {
  // Count the number of characters that fall into each classification
  const characterCount = new Map();
  for (let i = 0; i < password.length; i += 1) {
    const currentCharClassification = classifyCharacter(password.charCodeAt(i));
    if (!characterCount.has(currentCharClassification)) {
      characterCount.set(currentCharClassification, 1);
    } else {
      characterCount.set(
        currentCharClassification,
        characterCount.get(currentCharClassification) + 1,
      );
    }
  }
  // Determine if the password conforms to the given options
  const digits = characterCount.get('digit') || 0;
  const symbols = characterCount.get('symbol') || 0;
  const lowercase = characterCount.get('lowercase') || 0;
  const uppercase = characterCount.get('uppercase') || 0;
  const letters = lowercase + uppercase;
  return (
    (!options.useDigits
      || digits / password.length >= options.minDigitProportion)
    && (!(options.useSymbols && options.symbols.length > 0)
      || symbols / password.length >= options.minSymbolProportion)
    && (!(letters > 0 && options.useUppercase && options.useLowercase)
      || 2 * Math.abs(lowercase / letters - 0.5) <= options.maxCaseVariance)
  );
}

/**
 * Generates a cryptographically secure random string of the given length using the given
 * characters.
 *
 * @param {number} length The length of the random string to generate.
 * @param {string} characters The characters to build the random string from. Each
 *   character has an equal probability of being selected.
 * @returns {string} A random string of the given length made using the given characters.
 */
function generateRandomString(length, characters) {
  let randomString = '';
  for (let i = 0; i < length; i += 1) {
    randomString += characters[getRandomByteInRange(0, characters.length - 1)];
  }
  return randomString;
}

/**
 * Generates a cryptographically secure random password that has the characteristics
 * specified in the given options.
 *
 * @param {PasswordGenerationOptions} options The options describing the characteristics
 *   of the password to generate.
 * @param {number} timeout The maximum amount of time in seconds to wait before giving up
 *   generating the password.
 * @returns {string|null} The generated password, or null if the given timeout expired.
 */
function generatePassword(options, timeout) {
  // Measure the starting time
  const startTime = self.performance.now();

  // Determine what characters to use
  let passwordChars = '';
  if (options.useUppercase) {
    passwordChars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  if (options.useLowercase) {
    passwordChars += 'abcdefghijklmnopqrstuvwxyz';
  }
  if (options.useDigits) {
    passwordChars += '0123456789';
  }
  if (options.useSymbols) {
    passwordChars += options.symbols;
  }

  // Try to generate passwords until we get one that satisfies the given options
  let password = '';
  do {
    password = generateRandomString(options.passwordLength, passwordChars);

    // Check if we've been running for too long
    if (self.performance.now() - startTime >= timeout * 1000) {
      return null;
    }
  } while (!passwordIsValid(password, options));
  return password;
}

// Handle messages from the main thread to generate passwords
self.addEventListener('message', (event) => {
  switch (event.data.messageType) {
    case 'REQUEST_GENERATE_PASSWORD': {
      try {
        // Try generating the password, communicating back to the main thread whether the
        // password was generated, a timeout occurred, or an error occurred.
        const password = generatePassword(
          event.data.messageData.options,
          event.data.messageData.timeout,
        );
        if (password !== null) {
          self.postMessage({
            messageType: 'RESPONSE_GENERATE_PASSWORD',
            responseCode: 'OK',
            messageData: {
              password,
              requestId: event.data.messageData.requestId,
            },
          });
        } else {
          self.postMessage({
            messageType: 'RESPONSE_GENERATE_PASSWORD',
            responseCode: 'TIMEOUT',
            messageData: {
              requestId: event.data.messageData.requestId,
            },
          });
        }
      } catch (error) {
        self.postMessage({
          messageType: 'RESPONSE_GENERATE_PASSWORD',
          responseCode: 'ERROR',
          messageData: {
            message: error.message,
            requestId: event.data.messageData.requestId,
          },
        });
      }
      break;
    }
    default:
      break;
  }
});