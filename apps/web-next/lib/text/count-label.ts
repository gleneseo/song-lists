/** "1 song", "2 songs", "1,234 songs" -- a count with its noun agreeing in number. */
export function countLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}
