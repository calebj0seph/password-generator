/**
 * Classifies a printable ASCII character as either 'lowercase', 'uppercase', 'digit' or 'symbol'.
 *
 * @param {number} character A printable ASCII character code.
 * @returns {string} The classification of the character, or null if unknown.
 */
function classifyCharacter(character) {
  if (character >= 48 && character <= 57) {
    return 'digit';
  }
  if (character >= 65 && character <= 90) {
    return 'uppercase';
  }
  if (character >= 97 && character <= 122) {
    return 'lowercase';
  }
  if ((character >= 32 && character <= 47)
    || (character >= 58 && character <= 64)
    || (character >= 91 && character <= 96)
    || (character >= 123 && character <= 126)) {
    return 'symbol';
  }
  return null;
}

export default classifyCharacter;
