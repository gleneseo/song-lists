import { describe, expect, it } from "vitest";
import { normalizeText } from "../../../../lib/text/normalize";

describe("normalizeText", () => {
  it("should trim leading and trailing whitespace", () => {
    expect(normalizeText("  Thriller  ")).toBe("Thriller");
  });

  it("should collapse runs of internal whitespace into a single space", () => {
    expect(normalizeText("The   Rolling\t\tStones")).toBe("The Rolling Stones");
  });

  it("should straighten curly single quotes", () => {
    expect(normalizeText("Ain’t No Sunshine")).toBe("Ain't No Sunshine");
    expect(normalizeText("‘Til It Happens to You")).toBe(
      "'Til It Happens to You",
    );
  });

  it("should straighten curly double quotes", () => {
    expect(normalizeText("“Weird Al” Yankovic")).toBe('"Weird Al" Yankovic');
  });

  it("should preserve stylized casing and punctuation", () => {
    expect(normalizeText("P!nk")).toBe("P!nk");
    expect(normalizeText("WHAM!")).toBe("WHAM!");
  });
});
