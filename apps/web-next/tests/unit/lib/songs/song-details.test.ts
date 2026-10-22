import { describe, expect, it } from "vitest";
import { toSongDetails, type SongDetailsRow } from "@/lib/songs/song-details";

const day = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

const bareRow: SongDetailsRow = {
  id: 7,
  title: "Summer Breeze",
  bio: null,
  createdAt: day("2020-08-28"),
  artist: { id: 10, name: "The Isley Brothers" },
  featuredArtists: [],
  coverOf: [],
  coveredBy: [],
  productions: [],
  advocates: [],
  lists: [],
  metadata: null,
};

describe("toSongDetails", () => {
  it("should carry over the basic fields, flattening the artist", () => {
    expect(toSongDetails(bareRow)).toEqual({
      id: 7,
      title: "Summer Breeze",
      bio: null,
      addedAt: day("2020-08-28"),
      artistId: 10,
      artistName: "The Isley Brothers",
      featuredArtists: [],
      covers: [],
      coveredBy: [],
      productions: [],
      advocates: [],
      lists: [],
      metadata: null,
    });
  });

  it("should carry over what the lookup found for a matched song", () => {
    const actual = toSongDetails({
      ...bareRow,
      metadata: {
        status: "matched",
        source: "itunes",
        artworkUrl: "https://example.test/art/100x100bb.jpg",
        albumName: "Summer Breeze",
        releaseYear: 1974,
      },
    });

    expect(actual.metadata).toEqual({
      source: "itunes",
      artworkUrl: "https://example.test/art/100x100bb.jpg",
      albumName: "Summer Breeze",
      releaseYear: 1974,
    });
  });

  it.each(["not_found", "error"])(
    "should show nothing for a song whose lookup ended in %s",
    (status) => {
      const actual = toSongDetails({
        ...bareRow,
        metadata: {
          status,
          source: null,
          artworkUrl: null,
          albumName: null,
          releaseYear: null,
        },
      });

      expect(actual.metadata).toBeNull();
    },
  );

  it("should keep the bio when there is one", () => {
    expect(toSongDetails({ ...bareRow, bio: "A gem." }).bio).toBe("A gem.");
  });

  it("should list featured artists with their IDs, in the order given", () => {
    const actual = toSongDetails({
      ...bareRow,
      featuredArtists: [
        { artist: { id: 11, name: "Eddie Vedder" } },
        { artist: { id: 12, name: "Kawika Kahiapo" } },
      ],
    });

    expect(actual.featuredArtists).toEqual([
      { id: 11, name: "Eddie Vedder" },
      { id: 12, name: "Kawika Kahiapo" },
    ]);
  });

  it("should flatten the songs it covers, keeping their order", () => {
    const actual = toSongDetails({
      ...bareRow,
      coverOf: [
        {
          original: {
            id: 1,
            title: "Black Magic Woman",
            artist: { id: 20, name: "Fleetwood Mac" },
          },
        },
        {
          original: {
            id: 2,
            title: "Gypsy Queen",
            artist: { id: 21, name: "Gábor Szabó" },
          },
        },
      ],
    });

    expect(actual.covers).toEqual([
      {
        id: 1,
        title: "Black Magic Woman",
        artistId: 20,
        artistName: "Fleetwood Mac",
      },
      { id: 2, title: "Gypsy Queen", artistId: 21, artistName: "Gábor Szabó" },
    ]);
  });

  it("should order the songs that cover it by artist, then title", () => {
    const actual = toSongDetails({
      ...bareRow,
      coveredBy: [
        { song: { id: 3, title: "B", artist: { id: 30, name: "Zed" } } },
        { song: { id: 4, title: "Z", artist: { id: 31, name: "Abe" } } },
        { song: { id: 5, title: "A", artist: { id: 31, name: "Abe" } } },
      ],
    });

    expect(actual.coveredBy.map(({ id }) => id)).toEqual([5, 4, 3]);
  });

  it("should order productions by release year, then name, and flatten their type", () => {
    const actual = toSongDetails({
      ...bareRow,
      productions: [
        {
          production: {
            id: 41,
            name: "Zoolander",
            releaseYear: 2001,
            type: { name: "Film" },
          },
        },
        {
          production: {
            id: 42,
            name: "Almost Famous",
            releaseYear: 2001,
            type: { name: "Film" },
          },
        },
        {
          production: {
            id: 43,
            name: "Fletch",
            releaseYear: 1985,
            type: { name: "Film" },
          },
        },
      ],
    });

    expect(actual.productions).toEqual([
      { id: 43, name: "Fletch", releaseYear: 1985, typeName: "Film" },
      { id: 42, name: "Almost Famous", releaseYear: 2001, typeName: "Film" },
      { id: 41, name: "Zoolander", releaseYear: 2001, typeName: "Film" },
    ]);
  });

  it("should order advocates by when they joined, then name", () => {
    const actual = toSongDetails({
      ...bareRow,
      advocates: [
        { createdAt: day("2021-02-01"), advocate: { name: "Stuff" } },
        { createdAt: day("2020-05-27"), advocate: { name: "Minnz" } },
        { createdAt: day("2020-05-27"), advocate: { name: "Al" } },
      ],
    });

    expect(actual.advocates.map(({ name }) => name)).toEqual([
      "Al",
      "Minnz",
      "Stuff",
    ]);
  });

  it("should flatten the lists it is on, in list order, with who added it and when", () => {
    const actual = toSongDetails({
      ...bareRow,
      lists: [
        {
          createdAt: day("2021-02-01"),
          list: { id: 4, name: "Best Cover Songs" },
          creator: { name: "Cliff" },
        },
        {
          createdAt: day("2020-05-27"),
          list: { id: 1, name: "The Master List" },
          creator: { name: "Al" },
        },
      ],
    });

    expect(actual.lists).toEqual([
      {
        id: 1,
        name: "The Master List",
        addedBy: "Al",
        addedAt: day("2020-05-27"),
      },
      {
        id: 4,
        name: "Best Cover Songs",
        addedBy: "Cliff",
        addedAt: day("2021-02-01"),
      },
    ]);
  });

  it("should not mutate the row it is given", () => {
    const advocates = [
      { createdAt: day("2021-02-01"), advocate: { name: "Stuff" } },
      { createdAt: day("2020-05-27"), advocate: { name: "Al" } },
    ];

    toSongDetails({ ...bareRow, advocates });

    expect(advocates.map(({ advocate }) => advocate.name)).toEqual([
      "Stuff",
      "Al",
    ]);
  });
});
