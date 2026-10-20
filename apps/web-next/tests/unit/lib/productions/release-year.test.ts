import { describe, expect, it } from "vitest";
import { isValidReleaseYear } from "@/lib/productions/release-year";

describe("isValidReleaseYear", () => {
  it.each([1800, 1985, 2026, 2100])("should accept %i", (year) => {
    expect(isValidReleaseYear(year)).toBe(true);
  });

  it.each([1799, 2101, 0, -1985, 1985.5, Number.NaN, Infinity])(
    "should reject %s",
    (year) => {
      expect(isValidReleaseYear(year)).toBe(false);
    },
  );
});
