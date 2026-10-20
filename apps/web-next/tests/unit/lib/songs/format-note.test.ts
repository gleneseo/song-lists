import { describe, expect, it } from "vitest";
import { formatNote } from "@/lib/songs/format-note";

const now = new Date("2026-08-06T12:00:00Z");

describe("formatNote", () => {
  it("should sign the note with the author and the date", () => {
    expect(formatNote("Great live.", "Cliff", now)).toBe(
      "Great live. — Cliff · Aug 6, 2026, 5:00 AM PDT",
    );
  });

  it("should tidy the text", () => {
    expect(formatNote("  Great   live.  ", "Cliff", now)).toBe(
      "Great live. — Cliff · Aug 6, 2026, 5:00 AM PDT",
    );
  });

  it("should return null for a blank note", () => {
    expect(formatNote("  \n ", "Cliff", now)).toBeNull();
  });
});
