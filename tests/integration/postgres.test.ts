import { Socket } from "node:net";
import { createAuth } from "@song-lists/auth";
import { createDb, runMigrations, schema } from "@song-lists/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

const CONNECT_TIMEOUT_MS = 5_000;

const isListening = async (host: string, port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = new Socket();

    const finish = (reachable: boolean): void => {
      // Drop the one-shot listeners and keep a no-op error handler attached: a
      // socket that emits "error" with no listener throws, which would kill the
      // worker instead of failing this test.
      socket.removeAllListeners();
      socket.on("error", () => {
        // Ignored: the outcome is already decided.
      });
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once("connect", () => {
      finish(true);
    });
    socket.once("timeout", () => {
      /* empty */
    });
    socket.once("error", () => {
      finish(false);
    });
    socket.connect(port, host);
  });

describe("postgres testcontainer", () => {
  const postgres = inject("postgres");

  it("should expose connection details to tests", () => {
    const actual = postgres;

    expect(actual.connectionUri).toMatch(/^postgres(ql)?:\/\//);
    expect(actual.port).toBeGreaterThan(0);
  });

  it("should accept connections on the mapped port", async () => {
    const { host, port } = postgres;

    const actual = await isListening(host, port);

    expect(actual).toBeTruthy();
  });
});

describe("database integration", () => {
  const postgres = inject("postgres");
  const { db, pool } = createDb({ connectionString: postgres.connectionUri });

  beforeAll(async () => {
    await runMigrations(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("should apply every migration and create the expected tables", async () => {
    const { rows } = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'song_lists' order by table_name`,
    );

    expect(rows.map((row) => row.table_name)).toEqual([
      "accounts",
      "artists",
      "list_songs",
      "lists",
      "production_types",
      "productions",
      "sessions",
      "song_advocates",
      "song_covers",
      "song_featured_artists",
      "song_productions",
      "songs",
      "users",
      "verifications",
    ]);
  });

  it("should insert and read back rows, enforcing foreign keys through Drizzle relations", async () => {
    const [user] = await db
      .insert(schema.users)
      .values({ email: "curator@example.com", name: "Curator" })
      .returning();

    if (!user) {
      throw new Error("expected the user insert to return a row");
    }

    const [artist] = await db
      .insert(schema.artists)
      .values({ name: "Test Artist", createdBy: user.id, updatedBy: user.id })
      .returning();

    if (!artist) {
      throw new Error("expected the artist insert to return a row");
    }

    expect(artist.resource_id).toBeDefined();

    const found = await db.query.artists.findFirst({
      where: eq(schema.artists.id, artist.id),
      with: { creator: true },
    });

    expect(found?.creator.email).toBe("curator@example.com");
  });

  it("should let Better Auth sign a user up through the real adapter and schema", async () => {
    const auth = createAuth(db, { baseURL: "http://localhost:3000" });

    const result = await auth.api.signUpEmail({
      body: {
        email: "new-user@example.com",
        password: "correct horse battery staple",
        name: "New User",
      },
    });

    expect(result.user.email).toBe("new-user@example.com");

    const [row] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "new-user@example.com"));

    expect(row?.id).toBe(result.user.id);

    const [account] = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, result.user.id));

    expect(account?.issuer).toBe("local:credential");
  });
});
