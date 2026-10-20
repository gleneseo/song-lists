import { describe, expect, it } from "vitest";
import {
  toArtistDetails,
  type ArtistDetailsRow,
} from "@/lib/artists/artist-details";

const day = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

const bareRow: ArtistDetailsRow = {
  id: 5,
  name: "Devo",
  createdAt: day("2020-07-29"),
  songs: [],
  featuredOnSongs: [],
};

describe("toArtistDetails", () => {
  it("should carry over the basic fields", () => {
    expect(toArtistDetails(bareRow, [])).toEqual({
      id: 5,
      name: "Devo",
      addedAt: day("2020-07-29"),
      songs: [],
      featuredOn: [],
      lists: [],
    });
  });

  it("should order their songs by title, then id", () => {
    const actual = toArtistDetails(
      {
        ...bareRow,
        songs: [
          { id: 3, title: "Whip It", coverOf: [] },
          { id: 2, title: "Girl U Want", coverOf: [] },
          { id: 1, title: "Girl U Want", coverOf: [] },
        ],
      },
      [],
    );

    expect(actual.songs.map(({ id }) => id)).toEqual([1, 2, 3]);
  });

  it("should flatten the songs a cover covers, with their artists", () => {
    const actual = toArtistDetails(
      {
        ...bareRow,
        songs: [
          {
            id: 4,
            title: "Satisfaction",
            coverOf: [
              {
                original: {
                  id: 9,
                  title: "(I Can't Get No) Satisfaction",
                  artist: { id: 8, name: "The Rolling Stones" },
                },
              },
            ],
          },
        ],
      },
      [],
    );

    expect(actual.songs[0]?.covers).toEqual([
      {
        id: 9,
        title: "(I Can't Get No) Satisfaction",
        artistId: 8,
        artistName: "The Rolling Stones",
      },
    ]);
  });

  it("should order the songs they're featured on by title, with the main artist", () => {
    const actual = toArtistDetails(
      {
        ...bareRow,
        featuredOnSongs: [
          { song: { id: 7, title: "Zed", artist: { id: 1, name: "A" } } },
          { song: { id: 6, title: "Abe", artist: { id: 2, name: "B" } } },
        ],
      },
      [],
    );

    expect(actual.featuredOn).toEqual([
      { id: 6, title: "Abe", artistId: 2, artistName: "B" },
      { id: 7, title: "Zed", artistId: 1, artistName: "A" },
    ]);
  });

  it("should put the lists in list order without mutating the input", () => {
    const lists = [
      { id: 4, name: "Best Cover Songs", songCount: 1 },
      { id: 1, name: "The Master List", songCount: 12 },
    ];

    const actual = toArtistDetails(bareRow, lists);

    expect(actual.lists.map(({ id }) => id)).toEqual([1, 4]);
    expect(lists.map(({ id }) => id)).toEqual([4, 1]);
  });
});
