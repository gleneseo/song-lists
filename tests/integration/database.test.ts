import { PGlite } from "@electric-sql/pglite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authConfig } from "../../src/auth/config.js";
import * as schema from "../../src/db/schema/song-lists.js";

/**
 * These tests run our actual migration files against a real, disposable
 * Postgres engine (PGlite -- Postgres compiled to WASM, no Docker needed)
 * rather than against mocks. This is the only layer that can catch
 * adapter/schema mismatches: unit tests build a Better Auth instance but
 * never issue a real query against it, which is exactly how usePlural:
 * true went unnoticed in src/auth/auth.ts until this suite caught it.
 */
describe("database integration", () => {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema, casing: "snake_case" });

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./migrations" });
  });

  afterAll(async () => {
    await pglite.close();
  });

  it("should apply every migration and create the expected tables", async () => {
    const { rows } = await pglite.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'song_lists' order by table_name`,
    );

    expect(rows.map((row) => row.table_name)).toEqual([
      "accounts",
      "artists",
      "sessions",
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
    const auth = betterAuth({
      ...authConfig,
      database: drizzleAdapter(db, { schema, provider: "pg" }),
    });

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
  });
});
