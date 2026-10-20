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

/**
 * What the actions do when the database itself fails part way through. They
 * should answer with an error the form can show, and leave nothing half done.
 * A trigger that refuses every write to one table stands in for the failure.
 */
describe("when the database fails under an action", () => {
  let pool: Pool;
  let al: string;
  let cliff: string;
  let judd: string;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    al = await userId(pool, "Al");
    cliff = await userId(pool, "Cliff");
    judd = await userId(pool, "Judd");
    await pool.query(`
      create function song_lists.refuse_write() returns trigger as $$
      begin
        raise exception 'refused for the test';
      end;
      $$ language plpgsql
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  /** Refuses every update to `table` while `run` is going. */
  const refusingUpdatesTo = async (table: string, run: () => Promise<void>) => {
    await pool.query(
      `create trigger refuse before update on song_lists.${table}
       for each row execute function song_lists.refuse_write()`,
    );

    try {
      await run();
    } finally {
      await pool.query(`drop trigger refuse on song_lists.${table}`);
    }
  };

  const one = async (sql: string, params: unknown[] = []) =>
    (await pool.query(sql, params)).rows[0];

  const failed = { status: "error", message: expect.stringMatching(/\S/) };

  it("should report a failed song note, and leave the song's notes as they were", async () => {
    session.userId = cliff;
    const notes = await import("@/lib/actions/add-song-note");
    const song = await songId(pool, "Me And The Devil Blues", "Cowboy Junkies");
    const before = await one("select bio from song_lists.songs where id = $1", [
      song,
    ]);

    await refusingUpdatesTo("songs", async () => {
      expect(
        await notes.addSongNote({ songId: song, text: "Won't land." }),
      ).toEqual(failed);
    });

    expect(
      await one("select bio from song_lists.songs where id = $1", [song]),
    ).toEqual(before);
  });

  it("should report a failed artist rename, and leave the name alone", async () => {
    session.userId = al;
    const editArtist = await import("@/lib/actions/edit-artist");
    const artist = await artistId(pool, "Beck");

    await refusingUpdatesTo("artists", async () => {
      expect(
        await editArtist.updateArtist({
          artistId: artist,
          name: "Zz Not Beck",
        }),
      ).toEqual(failed);
    });

    expect(
      await one("select name from song_lists.artists where id = $1", [artist]),
    ).toEqual({
      name: "Beck",
    });
  });

  it("should report a failed production edit, and leave it alone", async () => {
    session.userId = al;
    const editProduction = await import("@/lib/actions/edit-production");
    const production = await one(
      "select id, name, release_year, type_id from song_lists.productions where name = 'Heavy Metal'",
    );

    await refusingUpdatesTo("productions", async () => {
      expect(
        await editProduction.updateProduction({
          productionId: production.id,
          name: "Zz Not Heavy Metal",
          releaseYear: 1990,
          typeId: production.type_id,
        }),
      ).toEqual(failed);
    });

    expect(
      await one(
        "select name, release_year from song_lists.productions where id = $1",
        [production.id],
      ),
    ).toEqual({ name: production.name, release_year: production.release_year });
  });

  it("should report a failed user edit, and leave the user alone", async () => {
    session.userId = al;
    const editUser = await import("@/lib/actions/edit-user");

    await refusingUpdatesTo("users", async () => {
      expect(
        await editUser.updateUser({
          userId: judd,
          name: "Zz Not Judd",
          firstName: "",
          lastName: "",
          email: "judd@seed.gleneseo.com",
          role: "user",
          bio: "",
        }),
      ).toEqual(failed);
    });

    expect(
      await one("select name from song_lists.users where id = $1", [judd]),
    ).toEqual({
      name: "Judd",
    });
  });

  it("should report a failed deactivation, and leave the user active", async () => {
    session.userId = al;
    const manage = await import("@/lib/actions/manage-user");

    await refusingUpdatesTo("users", async () => {
      expect(
        await manage.setUserActive({ userId: judd, active: false }),
      ).toEqual(failed);
    });

    expect(
      await one("select deactivated_at from song_lists.users where id = $1", [
        judd,
      ]),
    ).toEqual({ deactivated_at: null });
  });

  it("should report a failed password reset, and keep the old password working", async () => {
    session.userId = al;
    const manage = await import("@/lib/actions/manage-user");
    const { auth } = await import("@/lib/auth/auth");

    await refusingUpdatesTo("accounts", async () => {
      expect(
        await manage.resetUserPassword({
          userId: judd,
          password: "a long new password",
        }),
      ).toEqual(failed);
    });

    expect(
      (
        await auth.api.signInEmail({
          body: {
            email: "judd@seed.gleneseo.com",
            password: "sample-password",
          },
        })
      ).user.id,
    ).toBe(judd);
  });

  it("should add no song, and no artist for it, when a write part way through is refused", async () => {
    session.userId = al;
    const add = await import("@/lib/actions/add-song");
    const count = async () =>
      Number((await one("select count(*) n from song_lists.artists")).n);
    const before = await count();

    await pool.query(
      `create trigger refuse before insert on song_lists.songs
       for each row execute function song_lists.refuse_write()`,
    );

    try {
      const result = await add.createSong({
        artist: { kind: "new", name: "Zz Refused Band" },
        title: "Zz Refused Song",
        featuredArtists: [],
        production: null,
        cover: null,
        listIds: [],
        advocateUserIds: [],
      });

      expect(result).toEqual(failed);
    } finally {
      await pool.query("drop trigger refuse on song_lists.songs");
    }

    expect(await count()).toBe(before);
  });
});
