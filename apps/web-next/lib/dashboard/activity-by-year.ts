interface YearCount {
  year: number;
  count: number;
}

interface YearBucket extends YearCount {
  /** This year's count as a fraction of the busiest year's, from 0 to 1. */
  share: number;
}

interface ActivitySummary {
  firstYear: number;
  lastYear: number;
  busiestYear: number;
  busiestCount: number;
  total: number;
}

/**
 * Turns sparse per-year counts into a gapless, ascending series from the
 * first year with activity to the last, so a chart shows quiet years as
 * empty bars instead of skipping them.
 */
function bucketByYear(rows: YearCount[]): YearBucket[] {
  const countsByYear = new Map<number, number>();

  for (const { year, count } of rows) {
    countsByYear.set(year, (countsByYear.get(year) ?? 0) + count);
  }

  if (countsByYear.size === 0) {
    return [];
  }

  const years = [...countsByYear.keys()];
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  const busiest = Math.max(...countsByYear.values());

  return Array.from({ length: lastYear - firstYear + 1 }, (_, offset) => {
    const year = firstYear + offset;
    const count = countsByYear.get(year) ?? 0;

    return { year, count, share: count / busiest };
  });
}

function summarizeActivity(buckets: YearBucket[]): ActivitySummary | null {
  const [first] = buckets;
  const last = buckets.at(-1);

  if (!first || !last) {
    return null;
  }

  const busiest = buckets.reduce((best, bucket) =>
    bucket.count > best.count ? bucket : best,
  );

  return {
    firstYear: first.year,
    lastYear: last.year,
    busiestYear: busiest.year,
    busiestCount: busiest.count,
    total: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
  };
}

export { bucketByYear, summarizeActivity };
export type { ActivitySummary, YearBucket, YearCount };
