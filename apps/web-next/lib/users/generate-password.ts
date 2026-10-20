const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A random password from an alphabet without look-alike characters. */
function generatePassword(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint32Array(length));

  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export { generatePassword };
