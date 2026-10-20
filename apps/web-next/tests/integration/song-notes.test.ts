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

/** A note as it's signed: the text, the author, and a Pacific date and time. */
const signed = (text: string, author: string) =>
  new RegExp(
    `^${text.replaceAll(".", "\\.")} — ${author} · [A-Z][a-z]{2} \\d{1,2}, \\d{4}, \\d{1,2}:\\d{2} (AM|PM) (PDT|PST)$`,
  );

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

  const newSong = async (title: string, bio: string | null) =>
    (
      await pool.query<{ id: number }>(
        "insert into song_lists.songs (title, artist_id, bio, created_by, updated_by) values ($1, $2, $3, $4, $4) returning id",
        [title, artist, bio, al],
      )
    ).rows[0]?.id as number;

  const bioOf = async (id: number) =>
    (
      await pool.query<{ bio: string | null; updated_by: string }>(
        "select bio, updated_by from song_lists.songs where id = $1",
        [id],
      )
    ).rows[0];

  it("should let a manager add a note, signed with their name, below the existing ones", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Noted Song", "First note -Al");

    expect(
      await notes.addSongNote({ songId: song, text: "Great live." }),
    ).toEqual({
      status: "added",
    });

    const row = await bioOf(song);
    const lines = row?.bio?.split("\n") ?? [];

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("First note -Al");
    expect(lines[1]).toMatch(signed("Great live.", "Cliff"));
    expect(row?.updated_by).toBe(cliff);
  });

  it("should start the notes with it when the song has none", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Empty Song", null);

    await notes.addSongNote({ songId: song, text: "Hello." });

    expect((await bioOf(song))?.bio).toMatch(signed("Hello.", "Cliff"));
    expect((await bioOf(song))?.bio).not.toContain("\n");
  });

  it("should treat a song whose notes are an empty string as having none", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Blank Notes Song", "");

    await notes.addSongNote({ songId: song, text: "Hello again." });

    expect((await bioOf(song))?.bio).toMatch(signed("Hello again.", "Cliff"));
  });

  it("should let an admin add one too", async () => {
    session.userId = al;
    const song = await newSong("Zz Admin Noted Song", null);

    expect(
      await notes.addSongNote({ songId: song, text: "From the top." }),
    ).toEqual({
      status: "added",
    });
    expect((await bioOf(song))?.bio).toMatch(signed("From the top.", "Al"));
  });

  it.each([
    ["an ordinary user", () => judd],
    ["someone signed out", () => null],
  ])("should refuse %s, and change nothing", async (_who, who) => {
    session.userId = who();
    const song = await newSong("Zz Closed Song", "Original");

    expect(await notes.addSongNote({ songId: song, text: "Sneaky." })).toEqual({
      status: "error",
      message: "Only admins and managers can add notes.",
    });
    expect((await bioOf(song))?.bio).toBe("Original");
  });

  it("should read the role from the database, so a demoted manager is refused at once", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Demoted Song", null);

    await pool.query(
      "update song_lists.users set role = 'user' where id = $1",
      [cliff],
    );

    try {
      expect(
        await notes.addSongNote({ songId: song, text: "Too late." }),
      ).toMatchObject({
        status: "error",
      });
    } finally {
      await pool.query(
        "update song_lists.users set role = 'manager' where id = $1",
        [cliff],
      );
    }
  });

  it("should refuse a blank note and a song that doesn't exist", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Blank Note Song", "Original");

    expect(await notes.addSongNote({ songId: song, text: "  \n " })).toEqual({
      status: "error",
      message: "Write a note first.",
    });
    expect((await bioOf(song))?.bio).toBe("Original");
    expect(
      await notes.addSongNote({ songId: 999_999, text: "Nobody home." }),
    ).toEqual({
      status: "error",
      message: "That song couldn't be found.",
    });
  });

  it("should keep every note when several people add one at the same moment", async () => {
    session.userId = cliff;
    const song = await newSong("Zz Busy Song", "Original");

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        notes.addSongNote({ songId: song, text: `Note number ${index}.` }),
      ),
    );

    const lines = (await bioOf(song))?.bio?.split("\n") ?? [];

    expect(results.every((result) => result.status === "added")).toBe(true);
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe("Original");
    for (let index = 0; index < 8; index++) {
      expect(
        lines.some((line) => line.startsWith(`Note number ${index}.`)),
      ).toBe(true);
    }
  });

  it("should work on the real catalog's songs too, keeping what was there", async () => {
    session.userId = cliff;
    const song = await songId(pool, "Me And The Devil Blues", "Cowboy Junkies");
    const before = (await bioOf(song))?.bio ?? "";

    await notes.addSongNote({ songId: song, text: "Still great." });

    const after = (await bioOf(song))?.bio ?? "";

    expect(after.startsWith(`${before}\n`)).toBe(true);
    expect(after.split("\n")).toHaveLength(before.split("\n").length + 1);
  });
});
