/** Below this, two titles are treated as coincidentally similar, not the same song. */
const NEAR_DUPLICATE_SIMILARITY_THRESHOLD = 0.5;

/**
 * Picks the exact and near duplicate out of a set of candidate songs already
 * narrowed down (by the caller's query) to ones that are at least plausibly
 * related to `normalizedTitle`.
 */
function selectDuplicateMatches<
  T extends { title: string; similarity: number },
>(
  candidates: T[],
  normalizedTitle: string,
): { exact: T | null; near: T | null } {
  const exact =
    candidates.find(
      (candidate) =>
        candidate.title.toLowerCase() === normalizedTitle.toLowerCase(),
    ) ?? null;

  const near =
    candidates.find(
      (candidate) =>
        candidate !== exact &&
        candidate.similarity >= NEAR_DUPLICATE_SIMILARITY_THRESHOLD,
    ) ?? null;

  return { exact, near };
}

export { selectDuplicateMatches };
