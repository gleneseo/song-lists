/**
 * Cleans up a free-text name (song title, artist name, production name)
 * before it's persisted -- collapses runs of whitespace to a single space,
 * trims the ends, and straightens curly quotes/apostrophes to match the
 * existing catalog's style.
 *
 * It never changes casing or strips punctuation, since stylized names (band
 * names, song titles) need to survive untouched.
 */
export function normalizeText(input: string): string {
  return input
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
