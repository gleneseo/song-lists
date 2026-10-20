import { describe, expect, it } from "vitest";
import { filterSongs } from "@/lib/search/filter-songs";
import type { Song } from "@/lib/queries/songs";

const paintItBlack: Song = {
  id: 1,
  title: "Paint It, Black",
  artist: { id: 1, name: "The Rolling Stones" },
  featuredArtists: [],
  coverOf: [],
};
const satisfaction: Song = {
  id: 2,
  title: "Satisfaction",
  artist: { id: 2, name: "Devo" },
  featuredArtists: [],
  coverOf: [],
};
const angie: Song = {
  id: 3,
  title: "Angie",
  artist: { id: 1, name: "The Rolling Stones" },
  featuredArtists: [],
  coverOf: [],
};
const songs: Song[] = [paintItBlack, satisfaction, angie];

describe("filterSongs", () => {
  it("should return every song when the query is empty", () => {
    expect(filterSongs(songs, "")).toEqual(songs);
  });

  it("should return every song when the query is only whitespace", () => {
    expect(filterSongs(songs, "   ")).toEqual(songs);
  });

  it("should match songs by title", () => {
    expect(filterSongs(songs, "paint")).toEqual([paintItBlack]);
  });

  it("should match songs by artist name", () => {
    expect(filterSongs(songs, "rolling stones")).toEqual([paintItBlack, angie]);
  });

  it("should match case-insensitively", () => {
    expect(filterSongs(songs, "SATISFACTION")).toEqual([satisfaction]);
  });

  it("should trim surrounding whitespace from the query", () => {
    expect(filterSongs(songs, "  angie  ")).toEqual([angie]);
  });

  it("should return no songs when nothing matches", () => {
    expect(filterSongs(songs, "zzzznotasong")).toEqual([]);
  });

  it("should find a song whose artist spells a letter with a symbol", () => {
    const tooShort: Song = {
      id: 4,
      title: "Blow The Whistle",
      artist: { id: 3, name: "Too $hort" },
      featuredArtists: [],
      coverOf: [],
    };

    expect(filterSongs([...songs, tooShort], "short")).toEqual([tooShort]);
    expect(filterSongs([...songs, tooShort], "$hort")).toEqual([tooShort]);
  });

  it("should find a song whose title spells a letter with a symbol", () => {
    const pink: Song = {
      id: 5,
      title: "P!nk Cadillac",
      artist: { id: 4, name: "Bruce Springsteen" },
      featuredArtists: [],
      coverOf: [],
    };

    expect(filterSongs([...songs, pink], "pink cad")).toEqual([pink]);
  });
});
