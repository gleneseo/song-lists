import { createDb, schema, SYSTEM_USER_ID } from "@song-lists/db";
import {
  backfillSongMetadata,
  findSongsToBackfill,
  recordSongMetadata,
  type SongLookup,
} from "@song-lists/song-metadata";
import { eq, inArray } from "drizzle-orm";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, inject, it, vi } from "vitest";
import { createIsolatedDatabase } from "./support/isolated-database.js";

const found = {
  status: "matched",
  source: "itunes",
  sourceTrackId: "1234",
  artworkUrl: "https://example.test/art/100x100bb.jpg",
  albumName: "An Album",
  releaseYear: 1981,
} as const;

describe("looking songs up and keeping the results, in the database", () => {
  const postgres = inject("postgres");
  let pool: Pool;
  let db: ReturnType<typeof createDb>["db"];
  let songIds: number[];

  beforeAll(async () => {
    ({ pool, db } = createDb({
      connectionString: (await createIsolatedDatabase(postgres)).connectionUri,
    }));
    songIds = (
      await pool.query<{ id: number }>(
        "select id from song_lists.songs order by id",
      )
    ).rows.map((row) => row.id);
  });

  afterAll(async () => {
    await pool.end();
  });

  const rowOf = async (songId: number) =>
    (
      await db
        .select()
        .from(schema.songMetadata)
        .where(eq(schema.songMetadata.songId, songId))
    )[0];

  const save = (songId: number, status: string, matchedBy = "auto") =>
    db.insert(schema.songMetadata).values({
      songId,
      status,
      matchedBy,
      source: status === "matched" ? "itunes" : null,
      albumName: status === "matched" ? "Saved Album" : null,
      fetchedAt: new Date(),
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

  /** A song made just for a test, with nothing attached that stops it being deleted. */
  const newSong = async (title: string) => {
    const [artist] = await db
      .select({ id: schema.artists.id })
      .from(schema.artists)
      .limit(1);
    const [song] = await db
      .insert(schema.songs)
      .values({
        title,
        artistId: artist?.id ?? 0,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      })
      .returning({ id: schema.songs.id });

    return song?.id ?? 0;
  };

  /** Marks every song but these as already looked up, so a run has only these to do. */
  const leaveOnly = async (wanted: number[]) => {
    const everySong = await db
      .select({ id: schema.songs.id })
      .from(schema.songs);
    const others = everySong
      .map((song) => song.id)
      .filter((id) => !wanted.includes(id));

    await db.delete(schema.songMetadata);
    await db.insert(schema.songMetadata).values(
      others.map((songId) => ({
        songId,
        status: "not_found",
        matchedBy: "auto",
        fetchedAt: new Date(),
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      })),
    );
  };

  describe("recording one song", () => {
    it("should save what was found and say what it was", async () => {
      const id = await newSong("Zz Recorded Song");
      const lookup = vi.fn<SongLookup>(() => Promise.resolve(found));

      const outcome = await recordSongMetadata({ db, lookup }, id);

      expect(outcome).toMatchObject({
        status: "matched",
        title: "Zz Recorded Song",
        albumName: "An Album",
        releaseYear: 1981,
      });
      expect(lookup).toHaveBeenCalledWith({
        title: "Zz Recorded Song",
        artistName: expect.any(String) as string,
      });
      expect(await rowOf(id)).toMatchObject({
        status: "matched",
        source: "itunes",
        sourceTrackId: "1234",
        artworkUrl: "https://example.test/art/100x100bb.jpg",
        matchedBy: "auto",
        createdBy: SYSTEM_USER_ID,
      });
    });

    it("should save that nothing was found", async () => {
      const id = await newSong("Zz Unfound Song");

      const outcome = await recordSongMetadata(
        { db, lookup: () => Promise.resolve({ status: "not_found" }) },
        id,
      );

      expect(outcome).toMatchObject({
        status: "not_found",
        title: "Zz Unfound Song",
      });
      expect(await rowOf(id)).toMatchObject({
        status: "not_found",
        source: null,
        artworkUrl: null,
      });
    });

    it("should save a failed lookup and give the reason", async () => {
      const id = await newSong("Zz Failed Song");

      const outcome = await recordSongMetadata(
        {
          db,
          lookup: () => Promise.resolve({ status: "error", message: "429" }),
        },
        id,
      );

      expect(outcome).toMatchObject({ status: "error", message: "429" });
      expect(await rowOf(id)).toMatchObject({ status: "error" });
    });

    it("should replace an earlier automatic result", async () => {
      const id = await newSong("Zz Looked Up Again");
      await save(id, "not_found");

      await recordSongMetadata(
        { db, lookup: () => Promise.resolve(found) },
        id,
      );

      expect(await rowOf(id)).toMatchObject({
        status: "matched",
        albumName: "An Album",
      });
    });

    it("should keep details already found when a later lookup fails", async () => {
      const id = await newSong("Zz Kept Song");
      await save(id, "matched");

      await recordSongMetadata(
        {
          db,
          lookup: () => Promise.resolve({ status: "error", message: "429" }),
        },
        id,
      );

      expect(await rowOf(id)).toMatchObject({
        status: "matched",
        albumName: "Saved Album",
      });
    });

    it("should never undo a match that a person chose", async () => {
      const id = await newSong("Zz Chosen Song");
      await save(id, "matched", "manual");

      await recordSongMetadata(
        { db, lookup: () => Promise.resolve(found) },
        id,
      );

      expect(await rowOf(id)).toMatchObject({
        albumName: "Saved Album",
        matchedBy: "manual",
      });
    });

    it("should report a song that doesn't exist", async () => {
      await expect(
        recordSongMetadata(
          { db, lookup: () => Promise.resolve(found) },
          2_000_000_000,
        ),
      ).resolves.toEqual({ status: "missing" });
    });

    it("should report a lookup that blows up, whatever it throws", async () => {
      const id = await newSong("Zz Blown Song");

      await expect(
        recordSongMetadata(
          { db, lookup: () => Promise.reject(new Error("boom")) },
          id,
        ),
      ).resolves.toEqual({ status: "error", message: "boom" });
      await expect(
        recordSongMetadata(
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a client may throw something that isn't an Error
          { db, lookup: () => Promise.reject("odd") },
          id,
        ),
      ).resolves.toEqual({ status: "error", message: "odd" });
      expect(await rowOf(id)).toBeUndefined();
    });
  });

  describe("finding the songs to look up", () => {
    it("should find the songs never looked up, in the order they were added", async () => {
      await leaveOnly([]);
      await db
        .delete(schema.songMetadata)
        .where(inArray(schema.songMetadata.songId, songIds.slice(0, 5)));

      expect(
        await findSongsToBackfill(db, {
          retryErrors: false,
          retryNotFound: false,
        }),
      ).toEqual(songIds.slice(0, 5));
    });

    it("should stop at the limit", async () => {
      await db.delete(schema.songMetadata);

      expect(
        await findSongsToBackfill(db, {
          retryErrors: false,
          retryNotFound: false,
          limit: 3,
        }),
      ).toEqual(songIds.slice(0, 3));
    });

    it("should include failed lookups, and not-found ones only when asked", async () => {
      const [a, b, c, d] = songIds as [number, number, number, number];
      await leaveOnly([]);
      // Every other song is done and dusted, so only these four can be due.
      await db.update(schema.songMetadata).set({ status: "matched" });
      await db
        .delete(schema.songMetadata)
        .where(inArray(schema.songMetadata.songId, [a, b, c, d]));
      await save(a, "error");
      await save(b, "not_found");
      await save(c, "matched");
      await save(d, "matched", "manual");

      const due = (retryErrors: boolean, retryNotFound: boolean) =>
        findSongsToBackfill(db, { retryErrors, retryNotFound });

      expect(await due(false, false)).toEqual([]);
      expect(await due(true, false)).toEqual([a]);
      expect(await due(false, true)).toEqual([b]);
      expect(await due(true, true)).toEqual([a, b]);
    });
  });

  describe("backfilling", () => {
    it("should look up every song that is due, saving each and reporting as it goes", async () => {
      const first = await newSong("Zz Backfill One");
      const second = await newSong("Zz Backfill Two");
      const third = await newSong("Zz Backfill Three");
      await leaveOnly([first, second, third]);
      const answers = [
        found,
        { status: "not_found" },
        { status: "error", message: "429" },
      ] as const;
      const progress: string[] = [];

      const summary = await backfillSongMetadata({
        db,
        lookup: () => Promise.resolve(answers[progress.length] ?? found),
        retryErrors: true,
        retryNotFound: false,
        onProgress: ({ position, total, outcome }) => {
          progress.push(
            `${String(position)}/${String(total)} ${outcome.status}`,
          );
        },
      });

      expect(progress).toEqual(["1/3 matched", "2/3 not_found", "3/3 error"]);
      expect(summary).toEqual({
        total: 3,
        processed: 3,
        matched: 1,
        errors: 1,
        notFound: [
          {
            songId: second,
            title: "Zz Backfill Two",
            artistName: expect.any(String) as string,
          },
        ],
        ended: "finished",
      });
    });

    it("should carry on from where an earlier run stopped", async () => {
      const ids = [
        await newSong("Zz Resume One"),
        await newSong("Zz Resume Two"),
        await newSong("Zz Resume Three"),
      ];
      await leaveOnly(ids);
      const lookup: SongLookup = () => Promise.resolve(found);
      const options = { db, lookup, retryErrors: true, retryNotFound: false };

      const firstRun = await backfillSongMetadata({ ...options, limit: 2 });
      const secondRun = await backfillSongMetadata(options);

      expect(firstRun).toMatchObject({ total: 2, processed: 2, matched: 2 });
      expect(secondRun).toMatchObject({ total: 1, processed: 1, matched: 1 });
      expect(
        await backfillSongMetadata(options),
        "nothing left once all are done",
      ).toMatchObject({ total: 0, processed: 0, ended: "finished" });
    });

    it("should stop when asked, after the song in hand", async () => {
      const ids = [
        await newSong("Zz Stop One"),
        await newSong("Zz Stop Two"),
        await newSong("Zz Stop Three"),
      ];
      await leaveOnly(ids);
      let done = 0;

      const summary = await backfillSongMetadata({
        db,
        lookup: () => Promise.resolve(found),
        retryErrors: true,
        retryNotFound: false,
        onProgress: () => {
          done += 1;
        },
        shouldStop: () => done >= 2,
      });

      expect(summary).toMatchObject({
        total: 3,
        processed: 2,
        ended: "interrupted",
      });
    });

    it("should give up after too many failures in a row", async () => {
      const ids = [
        await newSong("Zz Give Up One"),
        await newSong("Zz Give Up Two"),
        await newSong("Zz Give Up Three"),
        await newSong("Zz Give Up Four"),
      ];
      await leaveOnly(ids);

      const summary = await backfillSongMetadata({
        db,
        lookup: () => Promise.resolve({ status: "error", message: "429" }),
        retryErrors: true,
        retryNotFound: false,
        maxConsecutiveErrors: 3,
      });

      expect(summary).toMatchObject({
        total: 4,
        processed: 3,
        errors: 3,
        ended: "too-many-errors",
      });
    });

    it("should not give up when failures are broken up by successes", async () => {
      const ids = [
        await newSong("Zz Mixed One"),
        await newSong("Zz Mixed Two"),
        await newSong("Zz Mixed Three"),
        await newSong("Zz Mixed Four"),
      ];
      await leaveOnly(ids);
      const answers = [
        { status: "error", message: "429" },
        found,
        { status: "error", message: "429" },
        found,
      ] as const;
      let asked = 0;

      const summary = await backfillSongMetadata({
        db,
        lookup: () => Promise.resolve(answers[asked++] ?? found),
        retryErrors: true,
        retryNotFound: false,
        maxConsecutiveErrors: 2,
      });

      expect(summary).toMatchObject({
        processed: 4,
        errors: 2,
        ended: "finished",
      });
    });

    it("should carry on past a song that was deleted meanwhile", async () => {
      const first = await newSong("Zz Gone One");
      const second = await newSong("Zz Gone Two");
      await leaveOnly([first, second]);

      const summary = await backfillSongMetadata({
        db,
        lookup: () => Promise.resolve(found),
        retryErrors: true,
        retryNotFound: false,
        onProgress: async ({ position }) => {
          if (position === 1) {
            await db.delete(schema.songs).where(eq(schema.songs.id, second));
          }
        },
      });

      expect(summary).toMatchObject({ total: 2, processed: 2, matched: 1 });
    });
  });
});
