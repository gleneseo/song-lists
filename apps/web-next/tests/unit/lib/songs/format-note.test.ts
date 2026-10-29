import { describe, expect, it } from "vitest";
import { formatNoteByline } from "@/lib/songs/format-note";

describe("formatNoteByline", () => {
  it("should name the author and give the date and time in Pacific time", () => {
    expect(formatNoteByline("Cliff", new Date("2026-08-06T12:00:00Z"))).toBe(
      "Cliff · Aug 6, 2026, 5:00 AM PDT",
    );
  });

  it("should use standard time in winter", () => {
    expect(formatNoteByline("Al", new Date("2026-01-06T12:00:00Z"))).toBe(
      "Al · Jan 6, 2026, 4:00 AM PST",
    );
  });
});
