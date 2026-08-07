import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("db client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should require a DATABASE_URL environment variable", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(import("../../../src/db/client.js")).rejects.toThrow(
      "DATABASE_URL environment variable is required",
    );
  });

  it("should connect using the configured DATABASE_URL", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgres://user:pass@localhost:5432/song_lists",
    );

    const { db, pool } = await import("../../../src/db/client.js");

    expect(pool.options.connectionString).toBe(
      "postgres://user:pass@localhost:5432/song_lists",
    );
    expect(db).toBeDefined();
  });
});
