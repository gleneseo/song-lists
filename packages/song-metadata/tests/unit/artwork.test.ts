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
});
