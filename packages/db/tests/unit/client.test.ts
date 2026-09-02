import { Pool } from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "../../src/client.js";

const CONNECTION_STRING = "postgres://user:pass@localhost:5432/song_lists";

describe("client", () => {
  const openPools: Pool[] = [];

  afterEach(async () => {
    while (openPools.length > 0) {
      await openPools.pop()?.end();
    }
  });

  it("should build a pool from the given connection string", () => {
    const { db, pool } = createDb({ connectionString: CONNECTION_STRING });
    openPools.push(pool);

    expect(pool.options.connectionString).toBe(CONNECTION_STRING);
    expect(db).toBeDefined();
  });

  it("should adopt a pool the caller already owns", () => {
    const existing = new Pool({ connectionString: CONNECTION_STRING });
    openPools.push(existing);

    const { pool } = createDb({ pool: existing });

    expect(pool).toBe(existing);
  });
});
