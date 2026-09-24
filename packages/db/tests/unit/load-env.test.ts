import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadNearestEnv } from "../../src/load-env.js";

describe("loadNearestEnv", () => {
  let tempDir: string;

  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "");
    tempDir = mkdtempSync(join(tmpdir(), "song-lists-load-env-"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env["SONG_LISTS_LOAD_ENV_TEST_VAR"];
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should skip loading when a database URL is already set", () => {
    vi.stubEnv("DATABASE_URL", "postgres://already-set");

    const loaded = loadNearestEnv(tempDir);

    expect(loaded).toBeUndefined();
  });

  it("should load the nearest .env found walking up from the given directory", () => {
    const envPath = join(tempDir, ".env");
    writeFileSync(envPath, "SONG_LISTS_LOAD_ENV_TEST_VAR=hello\n");
    const nested = join(tempDir, "nested", "deeper");
    mkdirSync(nested, { recursive: true });

    const loaded = loadNearestEnv(nested);

    expect(loaded).toBe(envPath);
    expect(process.env["SONG_LISTS_LOAD_ENV_TEST_VAR"]).toBe("hello");
  });

  it("should return undefined when no .env exists anywhere up the tree", () => {
    // None of these fabricated segments exist, so every candidate up to
    // (and including) the real filesystem root safely resolves to "not
    // found" without needing to touch or mock the filesystem.
    const nonexistentDeepPath = join(
      tempDir,
      "does-not-exist",
      "still-does-not-exist",
    );

    const loaded = loadNearestEnv(nonexistentDeepPath);

    expect(loaded).toBeUndefined();
  });
});
