import { describe, expect, it } from "vitest";
import {
  toProductionDetails,
  type ProductionDetailsRow,
} from "@/lib/productions/production-details";

const day = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

const bareRow: ProductionDetailsRow = {
  id: 3,
  name: "Fletch",
  releaseYear: 1985,
  typeId: 2,
  createdAt: day("2020-09-01"),
  type: { name: "Film" },
  songs: [],
};

describe("toProductionDetails", () => {
  it("should carry over the basic fields, flattening the type", () => {
    expect(toProductionDetails(bareRow, [])).toEqual({
      id: 3,
      name: "Fletch",
      releaseYear: 1985,
      typeId: 2,
      typeName: "Film",
      addedAt: day("2020-09-01"),
      songs: [],
      lists: [],
    });
  });

  it("should flatten its songs and order them by title, then id", () => {
    const actual = toProductionDetails(
      {
        ...bareRow,
        songs: [
          { song: { id: 5, title: "Zed", artist: { id: 1, name: "A" } } },
          { song: { id: 4, title: "Abe", artist: { id: 2, name: "B" } } },
          { song: { id: 3, title: "Abe", artist: { id: 2, name: "B" } } },
        ],
      },
      [],
    );

    expect(actual.songs).toEqual([
      { id: 3, title: "Abe", artistId: 2, artistName: "B" },
      { id: 4, title: "Abe", artistId: 2, artistName: "B" },
      { id: 5, title: "Zed", artistId: 1, artistName: "A" },
    ]);
  });

  it("should put the lists in list order", () => {
    const actual = toProductionDetails(bareRow, [
      { id: 6, name: "Getting Lit", songCount: 1 },
      { id: 2, name: "On A Boat!", songCount: 2 },
    ]);

    expect(actual.lists.map(({ id }) => id)).toEqual([2, 6]);
  });
});
