import { describe, expect, it } from "vitest";
import { albumLine } from "@/lib/songs/album-line";

describe("albumLine", () => {
  it("should give the album and its year", () => {
    expect(albumLine("Centerfield", 1985)).toBe("Centerfield · 1985");
  });

  it("should give just what is known when the album or the year is missing", () => {
    expect(albumLine("Centerfield", null)).toBe("Centerfield");
    expect(albumLine(null, 1985)).toBe("1985");
    expect(albumLine(undefined, 1985)).toBe("1985");
  });

  it("should give nothing when neither is known", () => {
    expect(albumLine(null, null)).toBeNull();
    expect(albumLine(undefined, undefined)).toBeNull();
  });
});
