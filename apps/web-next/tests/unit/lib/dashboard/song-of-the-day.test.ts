import { describe, expect, it } from "vitest";
import { songOfTheDayIndex } from "@/lib/dashboard/song-of-the-day";

describe("songOfTheDayIndex", () => {
  it("should return null when there are no songs", () => {
    expect(songOfTheDayIndex(0, new Date("2026-10-19T12:00:00Z"))).toBeNull();
  });

  it("should always pick the only song when there is just one", () => {
    expect(songOfTheDayIndex(1, new Date("2026-10-19T12:00:00Z"))).toBe(0);
  });

  it("should pick the same song for everyone at any time on the same UTC day", () => {
    const morning = songOfTheDayIndex(5000, new Date("2026-10-19T00:00:01Z"));
    const night = songOfTheDayIndex(5000, new Date("2026-10-19T23:59:59Z"));

    expect(morning).toBe(night);
  });

  it("should stay within the range of songs", () => {
    const picks = Array.from({ length: 60 }, (_, day) =>
      songOfTheDayIndex(7, new Date(Date.UTC(2026, 0, 1 + day))),
    );

    expect(picks.every((pick) => pick !== null && pick >= 0 && pick < 7)).toBe(
      true,
    );
  });

  it("should pick different songs on different days", () => {
    const picks = new Set(
      Array.from({ length: 30 }, (_, day) =>
        songOfTheDayIndex(5000, new Date(Date.UTC(2026, 0, 1 + day))),
      ),
    );

    expect(picks.size).toBeGreaterThan(20);
  });
});
