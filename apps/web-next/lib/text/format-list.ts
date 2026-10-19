/**
 * Joins names the way a sentence would: a single name on its own, two
 * joined by "&", and three or more comma-separated with "and" before the
 * last -- no Oxford comma.
 */
export function formatList(items: string[]): string {
  if (items.length < 3) {
    return items.join(" & ");
  }

  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
