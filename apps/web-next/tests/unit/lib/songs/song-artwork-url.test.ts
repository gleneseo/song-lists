import { describe, expect, it } from "vitest";
import { songArtworkUrl } from "@/lib/songs/song-artwork-url";

describe("songArtworkUrl", () => {
  it("should give the art of a song the lookup matched", () => {
    expect(
      songArtworkUrl({
        metadata: { status: "matched", artworkUrl: "/album-art/a.jpg" },
      }),
    ).toBe("/album-art/a.jpg");
  });

  it("should give none for a matched song with no art", () => {
    expect(
      songArtworkUrl({ metadata: { status: "matched", artworkUrl: null } }),
    ).toBeNull();
  });

  it.each(["not_found", "error"])(
    "should give none for a lookup that ended %s",
    (status) => {
      expect(
        songArtworkUrl({
          metadata: { status, artworkUrl: "https://a.test/x" },
        }),
      ).toBeNull();
    },
  );

  it("should give none for a song never looked up", () => {
    expect(songArtworkUrl({ metadata: null })).toBeNull();
  });
});
