/**
 * Escapes the characters LIKE / ILIKE treat as wildcards (`%` and `_`) and
 * the escape character itself (`\`), so a typed search matches them
 * literally instead of as a pattern.
 */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}
