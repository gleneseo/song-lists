import { describe, expect, it } from "vitest";
import {
  bucketByYear,
  summarizeActivity,
} from "@/lib/dashboard/activity-by-year";

describe("bucketByYear", () => {
  it("should return no buckets when there is no activity", () => {
    expect(bucketByYear([])).toEqual([]);
  });

  it("should fill quiet years between the first and last active year with zeroes", () => {
    const actual = bucketByYear([
      { year: 2020, count: 4 },
      { year: 2023, count: 2 },
    ]);

    expect(actual.map(({ year, count }) => [year, count])).toEqual([
      [2020, 4],
      [2021, 0],
      [2022, 0],
      [2023, 2],
    ]);
  });

  it("should sort the buckets by year regardless of input order", () => {
    const actual = bucketByYear([
      { year: 2022, count: 1 },
      { year: 2020, count: 1 },
    ]);

    expect(actual.map(({ year }) => year)).toEqual([2020, 2021, 2022]);
  });

  it("should scale each bucket's share to the busiest year", () => {
    const actual = bucketByYear([
      { year: 2020, count: 10 },
      { year: 2021, count: 5 },
      { year: 2022, count: 0 },
    ]);

    expect(actual.map(({ share }) => share)).toEqual([1, 0.5, 0]);
  });

  it("should add together repeated rows for the same year", () => {
    const actual = bucketByYear([
      { year: 2021, count: 3 },
      { year: 2021, count: 4 },
    ]);

    expect(actual).toEqual([{ year: 2021, count: 7, share: 1 }]);
  });
});

describe("summarizeActivity", () => {
  it("should return null when there are no buckets", () => {
    expect(summarizeActivity([])).toBeNull();
  });

  it("should report the range, busiest year, and total", () => {
    const buckets = bucketByYear([
      { year: 2020, count: 4 },
      { year: 2022, count: 9 },
      { year: 2023, count: 2 },
    ]);

    expect(summarizeActivity(buckets)).toEqual({
      firstYear: 2020,
      lastYear: 2023,
      busiestYear: 2022,
      busiestCount: 9,
      total: 15,
    });
  });

  it("should pick the earliest year when several are equally busy", () => {
    const buckets = bucketByYear([
      { year: 2020, count: 5 },
      { year: 2021, count: 5 },
    ]);

    expect(summarizeActivity(buckets)?.busiestYear).toBe(2020);
  });
});
