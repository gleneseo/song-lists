import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  artistId,
  openAppDatabase,
  productionId,
  userId,
} from "./support/app-database";

describe("the queries when the catalog has no songs yet", () => {
  let pool: Pool;
  let al: string;
  let dashboard: typeof import("@/lib/queries/dashboard");
  let lists: typeof import("@/lib/queries/lists");
  let songs: typeof import("@/lib/queries/songs");
  let artistDetails: typeof import("@/lib/queries/artist-details");
  let productionDetails: typeof import("@/lib/queries/production-details");

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    // Every song, and with it every list entry, advocate, cover, and link.
    await pool.query("truncate song_lists.songs cascade");
    dashboard = await import("@/lib/queries/dashboard");
    lists = await import("@/lib/queries/lists");
    songs = await import("@/lib/queries/songs");
    artistDetails = await import("@/lib/queries/artist-details");
    productionDetails = await import("@/lib/queries/production-details");
    al = await userId(pool, "Al");
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("the dashboard", () => {
    it("should have no song of the day", async () => {
      expect(await dashboard.getSongOfTheDay(new Date())).toBeNull();
    });

    it("should show empty figures and lists, not errors", async () => {
      expect(await dashboard.getUserStats(al)).toEqual({
        songsAdded: 0,
        artistsCovered: 0,
        listAdditions: 0,
        listsContributedTo: 0,
        firstAddedAt: null,
        lastAddedAt: null,
        catalogSongs: 0,
      });
      expect(await dashboard.getUserHistory(al, 5)).toEqual([]);
      expect(await dashboard.getUserTopArtists(al, 5)).toEqual([]);
      expect(await dashboard.getUserYearlyActivity(al)).toEqual([]);
      expect(await dashboard.getContributors()).toEqual([]);
      expect(await dashboard.getCatalogAdditions(10)).toEqual([]);
    });
  });

  describe("the lists", () => {
    it("should be empty, and say so", async () => {
      for (const list of await lists.getLists()) {
        expect(await lists.countListEntries(list.id, "", [])).toBe(0);
        expect(
          await lists.getListEntries(
            list.id,
            { query: "", sort: "title", direction: "asc" },
            [],
            0,
            50,
          ),
        ).toEqual([]);
      }
    });

    it("should show every list with nothing in it, and nothing added yet", async () => {
      const overview = await lists.getListsOverview(al);

      expect(overview.length).toBeGreaterThan(0);
      expect(overview.every((list) => list.songCount === 0)).toBe(true);
      expect(overview.every((list) => list.yourSongCount === 0)).toBe(true);
      expect(overview.every((list) => list.lastAddedAt === null)).toBe(true);
    });
  });

  describe("the catalog", () => {
    it("should have no songs to search or compare a new one with", async () => {
      expect(await songs.searchSongs("love")).toEqual([]);
      expect(
        await songs.findExistingSong(await artistId(pool, "Beck"), "Hotwax"),
      ).toEqual({ exact: null, near: null });
    });

    it("should show an artist or production that no song uses as having no songs", async () => {
      const artist = await artistDetails.getArtistDetails(
        await artistId(pool, "Beck"),
      );
      const production = await productionDetails.getProductionDetails(
        await productionId(pool, "Heavy Metal", 1981),
      );

      expect(artist).toMatchObject({
        name: "Beck",
        songs: [],
        featuredOn: [],
        lists: [],
      });
      expect(production).toMatchObject({
        name: "Heavy Metal",
        songs: [],
        lists: [],
      });
    });
  });
});
