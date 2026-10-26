import { createDb, schema, SYSTEM_USER_ID } from "@song-lists/db";
import { eq } from "drizzle-orm";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createIsolatedDatabase } from "./support/isolated-database.js";

describe("song metadata, in the database", () => {
  const postgres = inject("postgres");
  let pool: Pool;
  let db: ReturnType<typeof createDb>["db"];
  let songId: number;
  let otherSongId: number;

  beforeAll(async () => {
    ({ pool, db } = createDb({
      connectionString: (await createIsolatedDatabase(postgres)).connectionUri,
    }));

    const artist = await pool.query<{ id: number }>(
      "select id from song_lists.artists limit 1",
    );
    // The seed ships with lookup results, so start from songs it has none for.
    await pool.query("delete from song_lists.song_metadata where song_id <= 2");
    const songs = await pool.query<{ id: number }>(
      "select id from song_lists.songs order by id limit 2",
    );

    expect(artist.rows).toHaveLength(1);
    [songId, otherSongId] = songs.rows.map((row) => row.id) as [number, number];
  });

  afterAll(async () => {
    await pool.end();
  });

  const lookedUp = (song: number) => ({
    songId: song,
    status: "matched",
    source: "itunes",
    sourceTrackId: "1234",
    artworkUrl: "https://example.test/art/100x100bb.jpg",
    albumName: "An Album",
    releaseYear: 1981,
    matchedBy: "auto",
    fetchedAt: new Date(),
    createdBy: SYSTEM_USER_ID,
    updatedBy: SYSTEM_USER_ID,
  });

  it("should ship with the lookup results already in, and none that failed", async () => {
    const counts = await pool.query<{ status: string; total: string }>(
      `select status, count(*) as total
         from song_lists.song_metadata
        where song_id > 2
        group by status`,
    );
    const total = Object.fromEntries(
      counts.rows.map((row) => [row.status, Number(row.total)]),
    );

    expect(total["matched"]).toBeGreaterThan(0);
    expect(total["error"]).toBeUndefined();
  });

  it("should ship every song a lookup matched with its art, album, and track, every hand-set one with its album and year, and every other with none", async () => {
    const incomplete = await pool.query(
      `select s.title from song_lists.song_metadata m
         join song_lists.songs s on s.id = m.song_id
        where (m.status = 'matched' and m.matched_by = 'auto'
               and (m.artwork_url is null or m.album_name is null
                    or m.source_track_id is null or m.release_year is null))
           or (m.status = 'matched' and m.matched_by = 'manual'
               and (m.album_name is null or m.release_year is null))
           or (m.status <> 'matched'
               and (m.artwork_url is not null or m.album_name is not null
                    or m.source_track_id is not null))`,
    );

    expect(incomplete.rows).toEqual([]);
  });

  it("should save what a lookup found and give it back with the song", async () => {
    await db.insert(schema.songMetadata).values(lookedUp(songId));

    const song = await db.query.songs.findFirst({
      where: eq(schema.songs.id, songId),
      with: { metadata: true },
    });

    expect(song?.metadata).toMatchObject({
      songId,
      status: "matched",
      albumName: "An Album",
      releaseYear: 1981,
    });
  });

  it("should refuse a second row for the same song", async () => {
    await expect(
      db.insert(schema.songMetadata).values(lookedUp(songId)),
    ).rejects.toThrow();
  });

  it("should keep a row for a song that wasn't found, with no details", async () => {
    await db.insert(schema.songMetadata).values({
      songId: otherSongId,
      status: "not_found",
      matchedBy: "auto",
      fetchedAt: new Date(),
      createdBy: SYSTEM_USER_ID,
      updatedBy: SYSTEM_USER_ID,
    });

    const [row] = await db
      .select()
      .from(schema.songMetadata)
      .where(eq(schema.songMetadata.songId, otherSongId));

    expect(row).toMatchObject({
      status: "not_found",
      source: null,
      artworkUrl: null,
    });
  });
});
