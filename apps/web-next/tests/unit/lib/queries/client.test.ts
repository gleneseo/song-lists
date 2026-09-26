import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CONNECTION_STRING = "postgres://user:pass@localhost:5432/song_lists";

describe("client", () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.songListsDb = undefined;
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await globalThis.songListsDb?.$client.end();
    globalThis.songListsDb = undefined;
  });

  it("should require a database URL environment variable", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(import("../../../../lib/queries/client")).rejects.toThrow(
      "DATABASE_URL environment variable is required",
    );
  });

  it("should build a client using the configured database URL", async () => {
    vi.stubEnv("DATABASE_URL", CONNECTION_STRING);

    const { db } = await import("../../../../lib/queries/client");

    expect(db).toBeDefined();
  });

  it("should reuse the same client across module reloads", async () => {
    vi.stubEnv("DATABASE_URL", CONNECTION_STRING);

    const first = await import("../../../../lib/queries/client");
    vi.resetModules();
    const second = await import("../../../../lib/queries/client");

    expect(second.db).toBe(first.db);
  });
});
