import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { openAppDatabase, userId } from "./support/app-database";

const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/lib/auth/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth")>()),
  getSession: async () =>
    session.userId ? { user: { id: session.userId } } : null,
}));

describe("an admin managing lists, through the real database", () => {
  let pool: Pool;
  let manage: typeof import("@/lib/actions/manage-list");
  let queries: typeof import("@/lib/queries/lists");
  let al: string;
  let judd: string;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    manage = await import("@/lib/actions/manage-list");
    queries = await import("@/lib/queries/lists");
    al = await userId(pool, "Al");
    judd = await userId(pool, "Judd");
  });

  afterAll(async () => {
    await pool.end();
  });

  const listRow = async (id: number) =>
    (
      await pool.query(
        "select name, extra_columns, created_by, updated_by from song_lists.lists where id = $1",
        [id],
      )
    ).rows[0];

  const idOf = async (name: string) =>
    Number(
      (
        await pool.query<{ id: number }>(
          "select id from song_lists.lists where name = $1",
          [name],
        )
      ).rows[0]?.id,
    );

  const create = async (name: string) => {
    const result = await manage.createList({ name, extraColumns: [] });

    return result.status === "saved" ? result.listId : -1;
  };

  describe("creating a list", () => {
    it("should save it tidied up, with its columns and who made it", async () => {
      session.userId = al;

      const result = await manage.createList({
        name: "  Zz   Road Trip ",
        extraColumns: ["productions", "lyrics"],
      });

      expect(result.status).toBe("saved");
      const id = result.status === "saved" ? result.listId : -1;
      expect(await listRow(id)).toMatchObject({
        name: "Zz Road Trip",
        extra_columns: ["productions"],
        created_by: al,
        updated_by: al,
      });
    });

    it("should show it among the managed lists, empty", async () => {
      session.userId = al;
      const id = await create("Zz Listed");

      const lists = await queries.getManagedLists();

      expect(lists.find((list) => list.id === id)).toMatchObject({
        name: "Zz Listed",
        songCount: 0,
      });
    });

    it("should refuse a name another list has, in any case", async () => {
      session.userId = al;
      await create("Zz Twin");

      expect(
        await manage.createList({ name: "ZZ TWIN", extraColumns: [] }),
      ).toEqual({ status: "duplicate", name: "ZZ TWIN" });
    });

    it("should refuse a blank name", async () => {
      session.userId = al;

      expect(await manage.createList({ name: "  ", extraColumns: [] })).toEqual(
        { status: "error", message: "Name is required." },
      );
    });

    it("should refuse anyone who isn't an admin", async () => {
      session.userId = judd;

      expect(
        await manage.createList({ name: "Zz Sneaky", extraColumns: [] }),
      ).toEqual({
        status: "error",
        message: "Only admins can create lists.",
      });
    });
  });

  describe("editing a list", () => {
    it("should rename it, change its columns, and record who did", async () => {
      session.userId = al;
      const id = await create("Zz Before");

      const result = await manage.updateList({
        listId: id,
        name: " Zz After ",
        extraColumns: ["productions"],
      });

      expect(result).toEqual({ status: "saved", listId: id });
      expect(await listRow(id)).toMatchObject({
        name: "Zz After",
        extra_columns: ["productions"],
        updated_by: al,
      });
    });

    it("should let a list keep its own name when saving other changes", async () => {
      session.userId = al;
      const id = await create("Zz Same");

      const result = await manage.updateList({
        listId: id,
        name: "zz same",
        extraColumns: ["productions"],
      });

      expect(result.status).toBe("saved");
    });

    it("should refuse a name another list has", async () => {
      session.userId = al;
      await create("Zz Taken Name");
      const id = await create("Zz Other");

      expect(
        await manage.updateList({
          listId: id,
          name: "Zz Taken Name",
          extraColumns: [],
        }),
      ).toEqual({ status: "duplicate", name: "Zz Taken Name" });
    });

    it("should not rename the Master List, though its columns can change", async () => {
      session.userId = al;
      const master = await idOf("The Master List");

      expect(
        await manage.updateList({
          listId: master,
          name: "Renamed",
          extraColumns: [],
        }),
      ).toEqual({
        status: "error",
        message: "The Master List can't be renamed.",
      });
      expect(
        (
          await manage.updateList({
            listId: master,
            name: "The Master List",
            extraColumns: [],
          })
        ).status,
      ).toBe("saved");
    });

    it("should say so for a list that doesn't exist", async () => {
      session.userId = al;

      expect(
        await manage.updateList({
          listId: 999999,
          name: "Nowhere",
          extraColumns: [],
        }),
      ).toEqual({ status: "error", message: "That list couldn't be found." });
    });

    it("should refuse anyone who isn't an admin", async () => {
      session.userId = judd;
      const master = await idOf("The Master List");

      expect(
        (
          await manage.updateList({
            listId: master,
            name: "The Master List",
            extraColumns: [],
          })
        ).status,
      ).toBe("error");
    });
  });

  describe("deleting a list", () => {
    it("should remove an empty list", async () => {
      session.userId = al;
      const id = await create("Zz Empty");

      expect(await manage.deleteList(id)).toEqual({ status: "deleted" });
      expect(await listRow(id)).toBeUndefined();
    });

    it("should take the songs off a list but keep them in the catalog", async () => {
      session.userId = al;
      const id = await create("Zz Full");
      const { rows: songs } = await pool.query<{ id: number }>(
        "select id from song_lists.songs order by id limit 2",
      );
      for (const song of songs) {
        await pool.query(
          "insert into song_lists.list_songs (list_id, song_id, created_by, updated_by) values ($1, $2, $3, $3)",
          [id, song.id, al],
        );
      }
      const before = Number(
        (await pool.query("select count(*) n from song_lists.songs")).rows[0].n,
      );

      expect(await manage.deleteList(id)).toEqual({ status: "deleted" });

      expect(
        (
          await pool.query(
            "select count(*) n from song_lists.list_songs where list_id = $1",
            [id],
          )
        ).rows[0].n,
      ).toBe("0");
      expect(
        Number(
          (await pool.query("select count(*) n from song_lists.songs")).rows[0]
            .n,
        ),
      ).toBe(before);
    });

    it("should never delete the Master List", async () => {
      session.userId = al;
      const master = await idOf("The Master List");

      expect(await manage.deleteList(master)).toEqual({
        status: "error",
        message: "The Master List can't be deleted.",
      });
      expect(await listRow(master)).toBeDefined();
    });

    it("should refuse anyone who isn't an admin", async () => {
      session.userId = al;
      const id = await create("Zz Protected");
      session.userId = judd;

      expect((await manage.deleteList(id)).status).toBe("error");
      expect(await listRow(id)).toBeDefined();
    });
  });
});
