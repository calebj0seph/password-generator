/**
 * Removes duplicate characters from the given string.
 */
function removeDuplicateCharacters(str) {
  const charSet = new Set();
  for (let i = 0; i < str.length; i += 1) {
    charSet.add(str[i]);
  }
  let strUnique = '';
  charSet.forEach((character) => {
    strUnique += character;
  });
  return strUnique;
}

export default removeDuplicateCharacters;
