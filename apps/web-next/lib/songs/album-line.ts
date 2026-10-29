/**
 * An album's name and year as one line, "Centerfield · 1985": only what is
 * known when one of them isn't, and `null` when neither is
 */
function albumLine(
  albumName: string | null | undefined,
  releaseYear: number | null | undefined,
): string | null {
  const line = [albumName, releaseYear]
    .filter((part) => part !== null && part !== undefined)
    .join(" · ");

  return line === "" ? null : line;
}

export { albumLine };
