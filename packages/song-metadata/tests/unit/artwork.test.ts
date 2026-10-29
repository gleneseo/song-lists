import { describe, expect, it } from "vitest";
import { artworkUrlAtSize, largestArtworkUrl } from "../../src/artwork.js";

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

describe("largest artwork url", () => {
  it("should ask iTunes for more than it will ever hold, which it answers with the most it has", () => {
    expect(largestArtworkUrl("https://example.test/art/100x100bb.jpg")).toBe(
      "https://example.test/art/5000x5000bb.jpg",
    );
  });

  it.each([
    "https://coverartarchive.org/release-group/g1/front",
    "https://coverartarchive.org/release-group/g1/front-250",
    "https://coverartarchive.org/release-group/g1/front-1200",
  ])(
    "should ask the Cover Art Archive for the cover it holds, not one of its sizes: %s",
    (address) => {
      expect(largestArtworkUrl(address)).toBe(
        "https://coverartarchive.org/release-group/g1/front",
      );
    },
  );

  it("should leave a file of our own, or an address it doesn't recognize, alone", () => {
    expect(largestArtworkUrl("/album-art/the-cover-1969.jpg")).toBe(
      "/album-art/the-cover-1969.jpg",
    );
    expect(largestArtworkUrl("https://example.test/art/cover.jpg")).toBe(
      "https://example.test/art/cover.jpg",
    );
  });
});
