import { describe, expect, it } from "vitest";
import { readSymbols } from "@/lib/text/read-symbols";

describe("readSymbols", () => {
  it.each([
    ["Too $hort", "Too short"],
    ["A$AP Rocky", "AsAP Rocky"],
    ["Ke$ha", "Kesha"],
    ["Joey Bada$$", "Joey Badass"],
    ["Paper Trail$", "Paper Trails"],
  ])("should read the dollar sign in %s as an s", (text, expected) => {
    expect(readSymbols(text)).toBe(expected);
  });

  it("should leave a dollar sign before a number alone", () => {
    expect(readSymbols("$20 Bill")).toBe("$20 Bill");
  });

  it("should read an exclamation point inside a word as an i", () => {
    expect(readSymbols("P!nk")).toBe("Pink");
  });

  it.each(["Yahoo!", "Hey! You", "Panic! At The Disco", "!!!"])(
    "should leave the exclamation point in %s alone",
    (text) => {
      expect(readSymbols(text)).toBe(text);
    },
  );

  it("should leave text with neither symbol as it is", () => {
    expect(readSymbols("The Stone Roses")).toBe("The Stone Roses");
  });
});
