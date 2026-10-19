import { describe, expect, it } from "vitest";
import { formatDate, formatTimeAgo } from "@/lib/text/format-date";

const now = new Date(2026, 9, 19, 12);

describe("formatDate", () => {
  it("should format as an abbreviated month, day, and year", () => {
    expect(formatDate(new Date(Date.UTC(2026, 7, 6)))).toBe("Aug 6, 2026");
  });

  it("should show the stored calendar date whatever the viewer's time zone", () => {
    expect(formatDate(new Date("2019-08-16T00:00:00Z"))).toBe("Aug 16, 2019");
    expect(formatDate(new Date("2019-08-16T23:59:59Z"))).toBe("Aug 16, 2019");
  });
});

describe("formatTimeAgo", () => {
  it("should say today for anything under a day old", () => {
    expect(formatTimeAgo(new Date(2026, 9, 19, 3), now)).toBe("today");
  });

  it("should count days under a month", () => {
    expect(formatTimeAgo(new Date(2026, 9, 18, 11), now)).toBe("1 day ago");
    expect(formatTimeAgo(new Date(2026, 9, 9, 12), now)).toBe("10 days ago");
  });

  it("should count months under a year", () => {
    expect(formatTimeAgo(new Date(2026, 6, 19, 12), now)).toBe("3 months ago");
  });

  it("should count years beyond that", () => {
    expect(formatTimeAgo(new Date(2025, 9, 18, 12), now)).toBe("1 year ago");
    expect(formatTimeAgo(new Date(2019, 7, 16, 12), now)).toBe("7 years ago");
  });
});
