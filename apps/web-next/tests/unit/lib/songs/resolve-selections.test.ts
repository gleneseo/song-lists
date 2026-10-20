import { describe, expect, it } from "vitest";
import {
  resolveArtist,
  resolveCover,
  resolveProduction,
  type Transaction,
} from "@/lib/songs/resolve-selections";

/** A stand-in transaction that records inserts and hands back sequential ids. */
function fakeTransaction(options: { returnNothing?: boolean } = {}) {
  const inserted: unknown[] = [];
  let nextId = 100;

  const tx = {
    insert: () => ({
      values: (row: unknown) => {
        inserted.push(row);
        return {
          returning: async () =>
            options.returnNothing ? [] : [{ id: nextId++ }],
        };
      },
    }),
  } as unknown as Transaction;

  return { tx, inserted };
}

const USER = "user-1";

describe("resolveArtist", () => {
  it("should pass an existing artist's ID straight through", async () => {
    const { tx, inserted } = fakeTransaction();

    expect(
      await resolveArtist(tx, { kind: "existing", id: 7 }, USER, new Map()),
    ).toBe(7);
    expect(inserted).toEqual([]);
  });

  it("should insert a new artist with a cleaned-up name", async () => {
    const { tx, inserted } = fakeTransaction();

    const id = await resolveArtist(
      tx,
      { kind: "new", name: "  Dolly   Parton " },
      USER,
      new Map(),
    );

    expect(id).toBe(100);
    expect(inserted).toEqual([
      { name: "Dolly Parton", createdBy: USER, updatedBy: USER },
    ]);
  });

  it("should reuse an artist created earlier in the same submission, ignoring case", async () => {
    const { tx, inserted } = fakeTransaction();
    const cache = new Map<string, number>();

    const first = await resolveArtist(
      tx,
      { kind: "new", name: "Prince" },
      USER,
      cache,
    );
    const second = await resolveArtist(
      tx,
      { kind: "new", name: "PRINCE" },
      USER,
      cache,
    );

    expect(second).toBe(first);
    expect(inserted).toHaveLength(1);
  });

  it("should reject a blank new artist name", async () => {
    const { tx } = fakeTransaction();

    await expect(
      resolveArtist(tx, { kind: "new", name: "   " }, USER, new Map()),
    ).rejects.toThrow("Artist name is required.");
  });

  it("should fail if the insert returns no row", async () => {
    const { tx } = fakeTransaction({ returnNothing: true });

    await expect(
      resolveArtist(tx, { kind: "new", name: "Cher" }, USER, new Map()),
    ).rejects.toThrow("Expected the artist insert to return a row.");
  });
});

describe("resolveProduction", () => {
  it("should resolve to null when there is no production", async () => {
    const { tx } = fakeTransaction();

    expect(await resolveProduction(tx, null, USER)).toBeNull();
  });

  it("should pass an existing production's ID straight through", async () => {
    const { tx, inserted } = fakeTransaction();

    expect(await resolveProduction(tx, { kind: "existing", id: 3 }, USER)).toBe(
      3,
    );
    expect(inserted).toEqual([]);
  });

  it("should insert a new production with its year and type", async () => {
    const { tx, inserted } = fakeTransaction();

    const id = await resolveProduction(
      tx,
      { kind: "new", name: " Fletch ", releaseYear: 1985, typeId: 1 },
      USER,
    );

    expect(id).toBe(100);
    expect(inserted).toEqual([
      {
        name: "Fletch",
        releaseYear: 1985,
        typeId: 1,
        createdBy: USER,
        updatedBy: USER,
      },
    ]);
  });

  it("should reject a blank new production name", async () => {
    const { tx } = fakeTransaction();

    await expect(
      resolveProduction(
        tx,
        { kind: "new", name: " ", releaseYear: 1985, typeId: 1 },
        USER,
      ),
    ).rejects.toThrow("Production name is required.");
  });

  it("should fail if the insert returns no row", async () => {
    const { tx } = fakeTransaction({ returnNothing: true });

    await expect(
      resolveProduction(
        tx,
        { kind: "new", name: "Fletch", releaseYear: 1985, typeId: 1 },
        USER,
      ),
    ).rejects.toThrow("Expected the production insert to return a row.");
  });
});

describe("resolveCover", () => {
  it("should resolve to null when the song isn't a cover", async () => {
    const { tx } = fakeTransaction();

    expect(await resolveCover(tx, null, USER, new Map())).toBeNull();
  });

  it("should pass an existing original song's ID straight through", async () => {
    const { tx, inserted } = fakeTransaction();

    expect(
      await resolveCover(tx, { kind: "existing", songId: 9 }, USER, new Map()),
    ).toBe(9);
    expect(inserted).toEqual([]);
  });

  it("should insert a new original song under its artist", async () => {
    const { tx, inserted } = fakeTransaction();

    const id = await resolveCover(
      tx,
      {
        kind: "new",
        title: "  Jolene ",
        artist: { kind: "existing", id: 5 },
      },
      USER,
      new Map(),
    );

    expect(id).toBe(100);
    expect(inserted).toEqual([
      { title: "Jolene", artistId: 5, createdBy: USER, updatedBy: USER },
    ]);
  });

  it("should create a new original artist too when asked, sharing the cache", async () => {
    const { tx, inserted } = fakeTransaction();

    await resolveCover(
      tx,
      {
        kind: "new",
        title: "Jolene",
        artist: { kind: "new", name: "Dolly Parton" },
      },
      USER,
      new Map(),
    );

    expect(inserted).toEqual([
      { name: "Dolly Parton", createdBy: USER, updatedBy: USER },
      { title: "Jolene", artistId: 100, createdBy: USER, updatedBy: USER },
    ]);
  });

  it("should reject a blank new original title", async () => {
    const { tx } = fakeTransaction();

    await expect(
      resolveCover(
        tx,
        { kind: "new", title: " ", artist: { kind: "existing", id: 5 } },
        USER,
        new Map(),
      ),
    ).rejects.toThrow("Cover title is required.");
  });

  it("should fail if the song insert returns no row", async () => {
    const { tx } = fakeTransaction({ returnNothing: true });

    await expect(
      resolveCover(
        tx,
        { kind: "new", title: "Jolene", artist: { kind: "existing", id: 5 } },
        USER,
        new Map(),
      ),
    ).rejects.toThrow("Expected the song insert to return a row.");
  });
});
