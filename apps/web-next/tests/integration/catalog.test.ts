import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  artistId,
  openAppDatabase,
  productionId,
  songId,
} from "./support/app-database";

describe("searching and looking up the catalog, against the real database", () => {
  let pool: Pool;
  let songs: typeof import("@/lib/queries/songs");
  let artists: typeof import("@/lib/queries/artists");
  let productions: typeof import("@/lib/queries/productions");
  let songDetails: typeof import("@/lib/queries/song-details");
  let artistDetails: typeof import("@/lib/queries/artist-details");
  let productionDetails: typeof import("@/lib/queries/production-details");
  let songEdit: typeof import("@/lib/queries/song-edit");

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    songs = await import("@/lib/queries/songs");
    artists = await import("@/lib/queries/artists");
    productions = await import("@/lib/queries/productions");
    songDetails = await import("@/lib/queries/song-details");
    artistDetails = await import("@/lib/queries/artist-details");
    productionDetails = await import("@/lib/queries/production-details");
    songEdit = await import("@/lib/queries/song-edit");
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("the pickers on the add-song form", () => {
    it("should find an artist who spells a letter with a symbol by the plain letter", async () => {
      expect(
        (await artists.searchArtists("short")).map((a) => a.name),
      ).toContain("Too $hort");
      expect(
        (await artists.searchArtists("asap")).map((a) => a.name),
      ).toContain("A$AP Rocky");
    });

    it("should find a song by a part of its title, symbols and all", async () => {
      const titles = (await songs.searchSongs("trails")).map((s) => s.title);

      expect(titles).toContain("Paper Trail$");
    });

    it("should find a production, with its type and year", async () => {
      const found = await productions.searchProductions("heavy metal");

      expect(found).toContainEqual(
        expect.objectContaining({
          name: "Heavy Metal",
          releaseYear: 1981,
          type: expect.objectContaining({ name: "Film" }),
        }),
      );
    });

    it("should tell two productions with similar names apart", async () => {
      const found = await productions.searchProductions("transformers");
      const years = found
        .filter((production) => production.name.includes("Transformers"))
        .map((production) => production.releaseYear);

      expect(years).toEqual(expect.arrayContaining([1986, 2007]));
    });

    it("should return nothing for an empty search and honor the limit", async () => {
      expect(await artists.searchArtists("   ")).toEqual([]);
      expect(await songs.searchSongs("")).toEqual([]);
      expect(await productions.searchProductions("")).toEqual([]);
      expect(await artists.searchArtists("the", 3)).toHaveLength(3);
    });

    it("should offer the production types the schema defines", async () => {
      expect(
        (await productions.getProductionTypes()).map((type) => type.name),
      ).toEqual(expect.arrayContaining(["Film", "Television", "Stage"]));
    });
  });

  describe("the Songs page", () => {
    it("should order songs by title ignoring a leading article, like the lists do", async () => {
      const all = await songs.getSongs();
      const { rows } = await pool.query<{ id: number }>(
        `select id from song_lists.songs
         order by lower(regexp_replace(regexp_replace(regexp_replace(title, '\\$(?!\\d)', 's', 'g'), '!(?=\\w)', 'i', 'g'), '^(the|an|a|tha)\\s+(.+)$', '\\2, \\1', 'i')), id
         limit 200`,
      );

      expect(all.slice(0, 200).map((song) => song.id)).toEqual(
        rows.map((row) => row.id),
      );
      expect(all).toHaveLength(
        Number(
          (await pool.query("select count(*) n from song_lists.songs")).rows[0]
            .n,
        ),
      );
    });
  });

  describe("checking for a song that already exists", () => {
    it("should call the same title, in any case, an exact match", async () => {
      const artist = await artistId(pool, "Joey Bada$$");

      const found = await songs.findExistingSong(artist, "paper trail$");

      expect(found.exact?.title).toBe("Paper Trail$");
    });

    it("should offer a title that differs only by a symbol as a near match", async () => {
      const artist = await artistId(pool, "Joey Bada$$");

      const found = await songs.findExistingSong(artist, "Paper Trails");

      expect(found.exact).toBeNull();
      expect(found.near?.title).toBe("Paper Trail$");
    });

    it("should find nothing for a different title by the same artist", async () => {
      const artist = await artistId(pool, "Joey Bada$$");

      expect(
        await songs.findExistingSong(artist, "Zzz Nothing Like It"),
      ).toEqual({ exact: null, near: null });
    });

    it("should only look at the artist's own songs", async () => {
      const other = await artistId(pool, "Beck");

      expect(await songs.findExistingSong(other, "Paper Trail$")).toEqual({
        exact: null,
        near: null,
      });
    });
  });

  describe("a song's details", () => {
    it("should show a cover with the song it covers, and its notes", async () => {
      const id = await songId(pool, "Me And The Devil Blues", "Cowboy Junkies");
      const details = await songDetails.getSongDetails(id);

      expect(details?.artistName).toBe("Cowboy Junkies");
      expect(details?.covers).toEqual([
        expect.objectContaining({
          title: "Me And The Devil Blues",
          artistName: "Robert Johnson",
        }),
      ]);
      expect(details?.bio?.split("\n")).toHaveLength(2);
    });

    it("should show the other side of a cover: who has covered it", async () => {
      const original = await songId(
        pool,
        "Me And The Devil Blues",
        "Robert Johnson",
      );
      const details = await songDetails.getSongDetails(original);

      expect(details?.coveredBy.map((song) => song.artistName)).toEqual([
        "Cowboy Junkies",
      ]);
    });

    it("should show the film a song appears in", async () => {
      const id = await songId(pool, "Heavy Metal - Take A Ride", "Don Felder");
      const details = await songDetails.getSongDetails(id);

      expect(details?.productions).toEqual([
        {
          id: expect.any(Number),
          name: "Heavy Metal",
          releaseYear: 1981,
          typeName: "Film",
        },
      ]);
    });

    it("should show every advocate and every list the song is on", async () => {
      const id = await songId(pool, "Summer Song", "Joe Satriani");
      const details = await songDetails.getSongDetails(id);

      expect(details?.advocates.map((a) => a.name).toSorted()).toEqual([
        "Minnz",
        "Ryan",
      ]);
      expect(details?.lists.length).toBeGreaterThan(0);
      expect(details?.lists.every((list) => list.addedBy !== "")).toBe(true);
    });

    it("should find nothing for a song that doesn't exist", async () => {
      expect(await songDetails.getSongDetails(999_999)).toBeNull();
    });
  });

  describe("an artist's details", () => {
    it("should list the artist's songs by title and the lists they are on", async () => {
      const id = await artistId(pool, "Beck");
      const details = await artistDetails.getArtistDetails(id);
      const { rows } = await pool.query<{ n: string }>(
        "select count(*) n from song_lists.songs where artist_id = $1",
        [id],
      );

      expect(details?.name).toBe("Beck");
      expect(details?.songs).toHaveLength(Number(rows[0]?.n));
      expect(details?.songs.map((song) => song.title)).toEqual(
        expect.arrayContaining(["Hotwax", "High 5 (Rock The Catskills)"]),
      );
      expect(details?.lists.length).toBeGreaterThan(0);
    });

    it("should show the artist whose song was covered", async () => {
      const id = await artistId(pool, "Cowboy Junkies");
      const details = await artistDetails.getArtistDetails(id);
      const song = details?.songs.find(
        (s) => s.title === "Me And The Devil Blues",
      );

      expect(song?.covers.map((cover) => cover.artistName)).toEqual([
        "Robert Johnson",
      ]);
    });

    it("should find nothing for an artist that doesn't exist", async () => {
      expect(await artistDetails.getArtistDetails(999_999)).toBeNull();
    });
  });

  describe("a production's details", () => {
    it("should list the production's songs, its type, and where they are listed", async () => {
      const id = await productionId(pool, "Heavy Metal", 1981);
      const details = await productionDetails.getProductionDetails(id);

      expect(details).toMatchObject({
        name: "Heavy Metal",
        releaseYear: 1981,
        typeName: "Film",
      });
      expect(details?.songs).toContainEqual(
        expect.objectContaining({
          title: "Heavy Metal - Take A Ride",
          artistName: "Don Felder",
        }),
      );
    });

    it("should find nothing for a production that doesn't exist", async () => {
      expect(await productionDetails.getProductionDetails(999_999)).toBeNull();
    });
  });

  describe("the data the admin edit form starts from", () => {
    it("should load the song's current links and the choices on offer", async () => {
      const id = await songId(pool, "Me And The Devil Blues", "Cowboy Junkies");
      const data = await songEdit.getSongEditData(id);

      expect(data?.title).toBe("Me And The Devil Blues");
      expect(data?.artist).toMatchObject({ label: "Cowboy Junkies" });
      expect(data?.covers.map((cover) => cover.label)).toEqual([
        expect.stringContaining("Robert Johnson"),
      ]);
      expect(data?.lists.length).toBeGreaterThan(0);
      expect(data?.productionTypes.map((type) => type.name)).toContain("Film");
      expect(data?.advocateOptions.map((user) => user.name)).not.toContain(
        "System",
      );
    });

    it("should load who currently advocates the song", async () => {
      const id = await songId(pool, "Summer Song", "Joe Satriani");
      const data = await songEdit.getSongEditData(id);
      const { rows } = await pool.query<{ user_id: string }>(
        "select user_id from song_lists.song_advocates where song_id = $1",
        [id],
      );

      expect(data?.advocateIds.toSorted()).toEqual(
        rows.map((row) => row.user_id).toSorted(),
      );
    });

    it("should find nothing for a song that doesn't exist", async () => {
      expect(await songEdit.getSongEditData(999_999)).toBeNull();
    });
  });
});
