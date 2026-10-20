import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { databaseUri, type PostgresConnection } from "../setup/postgres.js";

/** Postgres's "object in use": the template is being copied for another file. */
const OBJECT_IN_USE = "55006";
const MAX_ATTEMPTS = 20;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isObjectInUse = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === OBJECT_IN_USE;

/**
 * Makes a database of this test file's own, a copy of the migrated and seeded
 * template, so a file can write to it without disturbing any other.
 *
 * Postgres copies a template one at a time, so files starting together take
 * turns: a copy that finds the template busy waits a moment and tries again.
 * Nothing is dropped afterwards -- the whole container is discarded when the
 * run ends.
 */
async function createIsolatedDatabase(
  postgres: PostgresConnection,
): Promise<{ connectionUri: string }> {
  const database = `test_${randomUUID().replaceAll("-", "")}`;

  for (let attempt = 1; ; attempt++) {
    const admin = new Client({ connectionString: postgres.connectionUri });
    await admin.connect();

    try {
      await admin.query(
        `CREATE DATABASE ${database} TEMPLATE ${postgres.templateDatabase}`,
      );

      return { connectionUri: databaseUri(postgres.connectionUri, database) };
    } catch (error) {
      if (!isObjectInUse(error) || attempt >= MAX_ATTEMPTS) {
        throw error;
      }

      await sleep(100 * attempt);
    } finally {
      await admin.end();
    }
  }
}

export { createIsolatedDatabase };
