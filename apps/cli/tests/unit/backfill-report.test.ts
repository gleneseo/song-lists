import type { BackfillSummary } from "@song-lists/song-metadata";
import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatPlan,
  formatProgress,
  formatReportCsv,
  formatSummary,
} from "../../src/backfill-report.js";

const progress = { position: 3, total: 40, songId: 9 };

describe("backfill report", () => {
  describe("duration", () => {
    it.each([
      [0, "0s"],
      [45_000, "45s"],
      [60_000, "1m"],
      [12 * 60_000, "12m"],
      [60 * 60_000, "1h 0m"],
      [4 * 3_600_000 + 40 * 60_000, "4h 40m"],
    ])("should write %d milliseconds as %s", (milliseconds, expected) => {
      expect(formatDuration(milliseconds)).toBe(expected);
    });
  });

  describe("plan", () => {
    it("should say how many songs and about how long they take", () => {
      expect(formatPlan(1200, 3000)).toBe(
        "1200 songs to look up, which takes about 1h 0m.",
      );
    });

    it("should use the singular for one song", () => {
      expect(formatPlan(1, 3000)).toBe(
        "1 song to look up, which takes about 3s.",
      );
    });

    it("should say so when there is nothing to do", () => {
      expect(formatPlan(0, 3000)).toBe(
        "Every song has been looked up; there is nothing to do.",
      );
    });
  });

  describe("progress", () => {
    it("should show a match with its album and year", () => {
      expect(
        formatProgress({
          ...progress,
          outcome: {
            status: "matched",
            title: "Freedom Of Choice",
            artistName: "Devo",
            albumName: "Freedom of Choice",
            releaseYear: 1980,
          },
        }),
      ).toBe(
        "[3/40] Devo — Freedom Of Choice: matched (Freedom of Choice, 1980)",
      );
    });

    it("should show a match with only what is known", () => {
      const outcome = {
        status: "matched",
        title: "Song",
        artistName: "Band",
        albumName: null,
        releaseYear: 1999,
      } as const;

      expect(formatProgress({ ...progress, outcome })).toBe(
        "[3/40] Band — Song: matched (1999)",
      );
      expect(
        formatProgress({
          ...progress,
          outcome: { ...outcome, releaseYear: null },
        }),
      ).toBe("[3/40] Band — Song: matched");
    });

    it("should show that nothing was found", () => {
      expect(
        formatProgress({
          ...progress,
          outcome: { status: "not_found", title: "Song", artistName: "Band" },
        }),
      ).toBe("[3/40] Band — Song: not found");
    });

    it("should show a failure with its reason", () => {
      expect(
        formatProgress({
          ...progress,
          outcome: {
            status: "error",
            message: "iTunes answered 429.",
            title: "Song",
            artistName: "Band",
          },
        }),
      ).toBe("[3/40] Band — Song: FAILED (iTunes answered 429.)");
    });

    it("should show a failure even when the song was never read", () => {
      expect(
        formatProgress({
          ...progress,
          outcome: { status: "error", message: "connection lost" },
        }),
      ).toBe("[3/40] ? — ?: FAILED (connection lost)");
    });

    it("should show a song that was deleted meanwhile", () => {
      expect(
        formatProgress({ ...progress, outcome: { status: "missing" } }),
      ).toBe("[3/40] (the song was deleted meanwhile)");
    });
  });

  describe("summary", () => {
    const base: BackfillSummary = {
      total: 10,
      processed: 10,
      matched: 8,
      errors: 0,
      notFound: [],
      ended: "finished",
    };

    it("should report a finished run", () => {
      expect(formatSummary(base)).toEqual([
        "",
        "Done.",
        "Looked up 10 of 10: 8 matched, 0 not found, 0 failed.",
      ]);
    });

    it("should list every song nothing was found for", () => {
      expect(
        formatSummary({
          ...base,
          matched: 7,
          notFound: [{ songId: 4, title: "The Pod", artistName: "Hum" }],
        }).slice(2),
      ).toEqual([
        "Looked up 10 of 10: 7 matched, 1 not found, 0 failed.",
        "",
        "Nothing was found for:",
        "  #4 Hum — The Pod",
      ]);
    });

    it("should say that failed songs come round again", () => {
      expect(formatSummary({ ...base, matched: 7, errors: 1 })).toContain(
        "Failed songs are tried again the next time it runs.",
      );
    });

    it("should say how to carry on after being stopped", () => {
      expect(
        formatSummary({ ...base, processed: 4, ended: "interrupted" })[1],
      ).toBe("Stopped early; run it again to carry on from here.");
    });

    it("should say why it gave up after too many failures", () => {
      expect(
        formatSummary({ ...base, processed: 5, ended: "too-many-errors" })[1],
      ).toMatch(/too many failures in a row/);
    });
  });

  describe("results file", () => {
    const row = {
      songId: 7,
      artistName: "Hum",
      title: "Stars",
      status: "matched",
      albumName: "You'd Prefer an Astronaut",
      releaseYear: 1995,
      sourceTrackId: "42",
      artworkUrl: "https://example.test/a/100x100bb.jpg",
      fetchedAt: new Date("2026-10-21T11:02:59.000Z"),
    };

    it("should start with a line naming the columns", () => {
      expect(formatReportCsv([]).split("\n")[0]).toBe(
        "song_id,artist,title,status,album,year,source_track_id,artwork_url,fetched_at",
      );
    });

    it("should write a line for each song", () => {
      expect(formatReportCsv([row]).split("\n")[1]).toBe(
        "7,Hum,Stars,matched,You'd Prefer an Astronaut,1995,42,https://example.test/a/100x100bb.jpg,2026-10-21T11:02:59.000Z",
      );
    });

    it("should leave the details blank for a song never looked up or not found", () => {
      const blank = {
        ...row,
        status: null,
        albumName: null,
        releaseYear: null,
        sourceTrackId: null,
        artworkUrl: null,
        fetchedAt: null,
      };

      expect(formatReportCsv([blank]).split("\n")[1]).toBe("7,Hum,Stars,,,,,,");
    });

    it("should quote a name with a comma, a quote, or a line break", () => {
      const awkward = {
        ...row,
        artistName: "Earth, Wind & Fire",
        title: 'The "Hit"\nSong',
      };

      expect(formatReportCsv([awkward])).toContain(
        '7,"Earth, Wind & Fire","The ""Hit""\nSong",matched',
      );
    });

    it("should end with a line break", () => {
      expect(formatReportCsv([row]).endsWith("\n")).toBe(true);
    });
  });
});
