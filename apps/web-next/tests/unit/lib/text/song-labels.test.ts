import { describe, expect, it } from "vitest";
import { coverOfLabel, featuredArtistsLabel } from "@/lib/text/song-labels";
import type { Song } from "@/lib/queries/songs";

function song(overrides: Partial<Song>): Song {
  return {
    id: 1,
    title: "Song",
    artist: { id: 1, name: "Artist" },
    featuredArtists: [],
    metadata: null,
    coverOf: [],
    ...overrides,
  };
}

describe("featuredArtistsLabel", () => {
  it("should return an empty string when there are no featured artists", () => {
    expect(featuredArtistsLabel([])).toBe("");
  });

  it("should format the featured artists' names as a list", () => {
    expect(
      featuredArtistsLabel([
        { artist: { name: "Prince" } },
        { artist: { name: "Billy Gibbons" } },
      ]),
    ).toBe("Prince & Billy Gibbons");
  });
});

describe("coverOfLabel", () => {
  it("should return an empty string for a song that isn't a cover", () => {
    expect(coverOfLabel(song({ coverOf: [] }))).toBe("");
  });

  it("should quote the original title and name its artist", () => {
    expect(
      coverOfLabel(
        song({
          coverOf: [
            {
              original: {
                title: "Hound Dog",
                artist: { name: "Big Mama Thornton" },
                featuredArtists: [],
              },
            },
          ],
        }),
      ),
    ).toBe('"Hound Dog" by Big Mama Thornton');
  });

  it("should append the original's featured artists in a '(feat. ...)' suffix", () => {
    expect(
      coverOfLabel(
        song({
          coverOf: [
            {
              original: {
                title: "Hound Dog",
                artist: { name: "Big Mama Thornton" },
                featuredArtists: [{ artist: { name: "Kansas City Bill" } }],
              },
            },
          ],
        }),
      ),
    ).toBe('"Hound Dog" by Big Mama Thornton feat. Kansas City Bill');
  });

  it("should join multiple originals with a comma when a song covers more than one", () => {
    expect(
      coverOfLabel(
        song({
          coverOf: [
            {
              original: {
                title: "Hound Dog",
                artist: { name: "Big Mama Thornton" },
                featuredArtists: [],
              },
            },
            {
              original: {
                title: "Mystery Train",
                artist: { name: "Junior Parker" },
                featuredArtists: [],
              },
            },
          ],
        }),
      ),
    ).toBe(
      '"Hound Dog" by Big Mama Thornton, "Mystery Train" by Junior Parker',
    );
  });
});
