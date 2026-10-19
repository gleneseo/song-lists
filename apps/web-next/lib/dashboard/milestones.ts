const SONG_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000] as const;

interface NextMilestone {
  target: number;
  remaining: number;
  /** Progress from the previous milestone to this one, from 0 to 1. */
  progress: number;
}

interface MilestoneProgress {
  earned: number[];
  next: NextMilestone | null;
}

/** Which song-count milestones a contributor has reached, and how close the next one is. */
function songMilestones(songCount: number): MilestoneProgress {
  const earned = SONG_MILESTONES.filter((target) => songCount >= target);
  const target = SONG_MILESTONES.find((candidate) => songCount < candidate);

  if (target === undefined) {
    return { earned, next: null };
  }

  const previous = earned.at(-1) ?? 0;

  return {
    earned,
    next: {
      target,
      remaining: target - songCount,
      progress: (songCount - previous) / (target - previous),
    },
  };
}

export { SONG_MILESTONES, songMilestones };
export type { MilestoneProgress, NextMilestone };
