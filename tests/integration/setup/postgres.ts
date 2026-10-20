import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { createDb } from "@song-lists/db";
import { runMigrations } from "@song-lists/db/migrate";
import { Client } from "pg";
import { getContainerRuntimeClient } from "testcontainers";
import type { TestProject } from "vitest/node";

const POSTGRES_IMAGE = "postgres:18-alpine";

/**
 * A database with every migration -- schema and seed data -- applied, built
 * once per run. Test files that write to the database copy it with
 * `CREATE DATABASE ... TEMPLATE`, which is far faster than migrating again
 * and gives each file its own data to change freely.
 */
const TEMPLATE_DATABASE = "song_lists_template";

const databaseUri = (connectionUri: string, database: string): string => {
  const uri = new URL(connectionUri);
  uri.pathname = `/${database}`;

  return uri.toString();
};

const createTemplateDatabase = async (connectionUri: string): Promise<void> => {
  const admin = new Client({ connectionString: connectionUri });
  await admin.connect();

  try {
    await admin.query(`CREATE DATABASE ${TEMPLATE_DATABASE}`);
  } finally {
    await admin.end();
  }

  const { db, pool } = createDb({
    connectionString: databaseUri(connectionUri, TEMPLATE_DATABASE),
  });

  try {
    await runMigrations(db);
  } finally {
    // A template can't be copied while anyone is connected to it.
    await pool.end();
  }
};

// `start()` only hands back a container once startup has fully succeeded, so a
// rejection part way through leaves nothing to call `stop()` on. Testcontainers
// cleans up after itself when the *wait strategy* fails, but not when the steps
// between "container created" and "wait for ready" do, which leaves a running
// container that only Ryuk will reap. `containerCreated` is the library's own
// hook for that window: it fires with the ID immediately after creation.
class TrackedPostgreSqlContainer extends PostgreSqlContainer {
  #createdContainerId: string | undefined;

  get createdContainerId(): string | undefined {
    return this.#createdContainerId;
  }

  protected override containerCreated(containerId: string): Promise<void> {
    this.#createdContainerId = containerId;
    return Promise.resolve();
  }
}

const discardOrphan = async (
  containerId: string | undefined,
): Promise<void> => {
  if (containerId === undefined) {
    return;
  }

  try {
    const client = await getContainerRuntimeClient();
    const orphan = client.container.getById(containerId);
    await client.container.stop(orphan, { timeout: 0 });
    await client.container.remove(orphan, { removeVolumes: true });
  } catch {
    // Best effort. The container is usually already gone — testcontainers
    // removes it itself on a wait-strategy failure — and Ryuk reaps anything
    // this misses. Never mask the startup error that got us here.
  }
};

declare module "vitest" {
  interface ProvidedContext {
    postgres: PostgresConnection;
  }
}

// Runs once per integration run in the vitest main process, before any worker
// starts, so every test file shares a single container instead of starting one
// per suite. Declared on the integration project only, so it never runs for
// `npm run test:unit`.
const setup = async (project: TestProject): Promise<() => Promise<void>> => {
  const factory = new TrackedPostgreSqlContainer(POSTGRES_IMAGE);

  let container: StartedPostgreSqlContainer;
  try {
    container = await factory.start();
  } catch (error) {
    await discardOrphan(factory.createdContainerId);
    throw error;
  }

  try {
    await createTemplateDatabase(container.getConnectionUri());
  } catch (error) {
    await container.stop();
    throw error;
  }

  project.provide("postgres", {
    templateDatabase: TEMPLATE_DATABASE,
    connectionUri: container.getConnectionUri(),
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    username: container.getUsername(),
    password: container.getPassword(),
  });

  return async (): Promise<void> => {
    await container.stop();
  };
};

interface PostgresConnection {
  /** The database to copy, with every migration applied, for a file of its own. */
  templateDatabase: string;
  connectionUri: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export { databaseUri };
export type { PostgresConnection };
export default setup;
