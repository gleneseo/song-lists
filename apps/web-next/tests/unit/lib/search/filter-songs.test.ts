import { describe, expect, it } from "vitest";
import { filterSongs } from "../../../../lib/search/filter-songs";
import type { Song } from "../../../../lib/queries/songs";

const paintItBlack: Song = {
  id: 1,
  title: "Paint It, Black",
  artist: { name: "The Rolling Stones" },
};
const satisfaction: Song = {
  id: 2,
  title: "Satisfaction",
  artist: { name: "Devo" },
};
const angie: Song = {
  id: 3,
  title: "Angie",
  artist: { name: "The Rolling Stones" },
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
});
