interface Contributor {
  userId: string;
  name: string;
  count: number;
}

interface RankedContributor extends Contributor {
  rank: number;
  isYou: boolean;
}

interface Leaderboard {
  /** The top `size` contributors, plus the viewer's own row when they fall outside it. */
  entries: RankedContributor[];
  /** The viewer's row, or `null` when they haven't contributed anything yet. */
  you: RankedContributor | null;
  totalContributors: number;
}

/**
 * Ranks contributors by song count, highest first (ties broken by name so
 * the order is stable). Tied contributors share a rank and the next rank
 * skips ahead -- 1, 2, 2, 4 -- the way a sports table would.
 */
function rankContributors(
  contributors: Contributor[],
  viewerId: string,
): RankedContributor[] {
  const sorted = contributors.toSorted(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );

  let rank = 0;
  let previousCount: number | undefined;

  return sorted.map((contributor, index) => {
    if (contributor.count !== previousCount) {
      rank = index + 1;
      previousCount = contributor.count;
    }

    return { ...contributor, rank, isYou: contributor.userId === viewerId };
  });
}

function buildLeaderboard(
  contributors: Contributor[],
  viewerId: string,
  size = 5,
): Leaderboard {
  const ranked = rankContributors(contributors, viewerId);
  const top = ranked.slice(0, size);
  const you = ranked.find((contributor) => contributor.isYou) ?? null;

  return {
    entries: you && !top.includes(you) ? [...top, you] : top,
    you,
    totalContributors: ranked.length,
  };
}

export { buildLeaderboard, rankContributors };
export type { Contributor, Leaderboard, RankedContributor };
