import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  artistId,
  openAppDatabase,
  songId,
  userId,
} from "./support/app-database";

const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/lib/auth/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth")>()),
  getSession: async () =>
    session.userId ? { user: { id: session.userId } } : null,
}));

describe("adding a note to a song, from the action down to the database", () => {
  let pool: Pool;
  let notes: typeof import("@/lib/actions/add-song-note");
  let al: string;
  let cliff: string;
  let judd: string;
  let artist: number;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    notes = await import("@/lib/actions/add-song-note");
    al = await userId(pool, "Al");
    cliff = await userId(pool, "Cliff");
    judd = await userId(pool, "Judd");
    artist = await artistId(pool, "Beck");
  });

  afterAll(async () => {
    await pool.end();
  });

  const newSong = async (title: string, bio: string | null = null) =>
    (
      await pool.query<{ id: number }>(
        "insert into song_lists.songs (title, artist_id, bio, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [title, artist, bio, al],
      )
    ).rows[0]?.id as number;

  const notesOf = async (id: number) =>
    (
      await pool.query<{ body: string; created_by: string }>(
        "select body, created_by from song_lists.song_notes where song_id = $1 order by id",
        [id],
      )
    ).rows;

  const bioOf = async (id: number) =>
    (
      await pool.query<{ bio: string | null }>(
        "select bio from song_lists.songs where id = $1",
        [id],
      )
    ).rows[0]?.bio;

  it("should let a manager add a note, in their name, after the existing ones", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Noted Song");
    await notes.addSongNote({ songId: song, text: "First note" });

    expect(
      await notes.addSongNote({ songId: song, text: "Great live." }),
    ).toEqual({ status: "added" });
    expect(await notesOf(song)).toEqual([
      { body: "First note", created_by: cliff },
      { body: "Great live.", created_by: cliff },
    ]);
  });

  it("should tidy the note's text", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Tidy Note Song");

    await notes.addSongNote({ songId: song, text: "  Hello   there.  " });

    expect((await notesOf(song)).map((note) => note.body)).toEqual([
      "Hello there.",
    ]);
  });

  it("should leave the song's bio alone", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Bio Kept Song", "A real bio.");

    await notes.addSongNote({ songId: song, text: "A note." });

    expect(await bioOf(song)).toBe("A real bio.");
  });

  it("should let an admin add one too", async () => {
    session.userId = al;
    const song = await newSong("Zz Admin Noted Song");

    expect(
      await notes.addSongNote({ songId: song, text: "From the top." }),
    ).toEqual({ status: "added" });
    expect(await notesOf(song)).toEqual([
      { body: "From the top.", created_by: al },
    ]);
  });

  it.each([
    ["an ordinary user", () => judd],
    ["someone signed out", () => null],
  ])("should refuse %s, and change nothing", async (_who, who) => {
    session.userId = who();
    const song = await newSong("Zz Closed Song");

    expect(await notes.addSongNote({ songId: song, text: "Sneaky." })).toEqual({
      status: "error",
      message: "Only admins and managers can add notes.",
    });
    expect(await notesOf(song)).toEqual([]);
  });

  it("should read the role from the database, so a demoted manager is refused at once", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Demoted Song");

    await pool.query(
      "update song_lists.users set role = 'user' where id = $1",
      [cliff],
    );

    try {
      expect(
        await notes.addSongNote({ songId: song, text: "Too late." }),
      ).toMatchObject({ status: "error" });
    } finally {
      await pool.query(
        "update song_lists.users set role = 'manager' where id = $1",
        [cliff],
      );
    }

    expect(await notesOf(song)).toEqual([]);
  });

  it("should refuse a blank note and a song that doesn't exist", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Blank Note Song");

    expect(await notes.addSongNote({ songId: song, text: "  \n " })).toEqual({
      status: "error",
      message: "Write a note first.",
    });
    expect(await notesOf(song)).toEqual([]);
    expect(
      await notes.addSongNote({ songId: 999_999, text: "Nobody home." }),
    ).toEqual({
      status: "error",
      message: "That song couldn't be found.",
    });
  });

  it("should keep every note when several people add one at the same moment", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Busy Song");

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        notes.addSongNote({ songId: song, text: `Note number ${index}.` }),
      ),
    );

    expect(results.every((result) => result.status === "added")).toBe(true);
    expect((await notesOf(song)).map((note) => note.body).toSorted()).toEqual(
      Array.from({ length: 8 }, (_, index) => `Note number ${index}.`),
    );
  });

  it("should work on the real catalog's songs too, keeping what was there", async () => {
    session.userId = cliff;
    const song = await songId(pool, "Me And The Devil Blues", "Cowboy Junkies");
    const before = await notesOf(song);

    await notes.addSongNote({ songId: song, text: "Still great." });

    const after = await notesOf(song);

    expect(after.slice(0, before.length)).toEqual(before);
    expect(after.at(-1)?.body).toBe("Still great.");
    expect(after).toHaveLength(before.length + 1);
  });
});
