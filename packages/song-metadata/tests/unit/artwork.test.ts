import { describe, expect, it } from "vitest";
import { artworkUrlAtSize } from "../../src/artwork.js";

describe("artwork url", () => {
  it("should ask for the artwork at another size", () => {
    expect(
      artworkUrlAtSize("https://example.test/art/100x100bb.jpg", 600),
    ).toBe("https://example.test/art/600x600bb.jpg");
  });

  it("should handle an address without the suffix, or in another format", () => {
    expect(artworkUrlAtSize("https://example.test/art/100x100.png", 300)).toBe(
      "https://example.test/art/300x300.png",
    );
  });

  it("should leave an address it doesn't recognize alone", () => {
    expect(artworkUrlAtSize("https://example.test/art/cover.jpg", 600)).toBe(
      "https://example.test/art/cover.jpg",
    );
  });

  it.each([
    [100, "front-250"],
    [250, "front-250"],
    [400, "front-500"],
    [900, "front-1200"],
    [5000, "front-1200"],
  ])(
    "should ask the Cover Art Archive for a cover at %s pixels",
    (pixels, name) => {
      expect(
        artworkUrlAtSize(
          "https://coverartarchive.org/release-group/g1/front",
          pixels,
        ),
      ).toBe(`https://coverartarchive.org/release-group/g1/${name}`);
    },
  );
});
