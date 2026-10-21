import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

const REPO = new URL("../../../", import.meta.url).pathname;
const APP = `${REPO}apps/web-next`;
const LOGS = `${REPO}.uat-logs`;
const PORT = Number(process.env["UAT_PORT"] ?? 3100);
const BASE_URL = `http://127.0.0.1:${String(PORT)}`;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Runs a command to completion, failing loudly, with its output kept in a log. */
function run(
  label: string,
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): void {
  const log = openSync(`${LOGS}/${label}.log`, "w");
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: ["ignore", log, log],
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed; see .uat-logs/${label}.log`);
  }
}

async function waitForServer(server: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) {
      throw new Error(
        `The app exited early; see .uat-logs/server.log (is port ${String(PORT)} free?)`,
      );
    }

    try {
      const response = await fetch(`${BASE_URL}/sign-in`);

      if (response.ok) {
        return;
      }
    } catch {
      // Not listening yet.
    }

    await sleep(500);
  }

  throw new Error("The app never started answering; see .uat-logs/server.log");
}

/**
 * Everything the browser tests stand on, started once per run: a throwaway
 * Postgres with the migrations (and so the seed data) applied, a production
 * build of the app in a folder of its own, the app itself serving on
 * `PORT`. The teardown stops it all.
 *
 * Set `UAT_SKIP_BUILD=1` to reuse the last build while writing tests.
 */
async function globalSetup(): Promise<() => Promise<void>> {
  mkdirSync(LOGS, { recursive: true });

  const container = await new PostgreSqlContainer("postgres:18-alpine").start();
  const databaseUrl = container.getConnectionUri();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: BASE_URL,
    // Next bakes this into the browser code when it builds, so the page asks
    // this server who is signed in -- not whichever one the repo's .env names.
    NEXT_PUBLIC_BETTER_AUTH_URL: BASE_URL,
    BETTER_AUTH_SECRET: "test-secret-used-only-in-uat-tests",
    NEXT_DIST_DIR: ".next-uat",
    NEXT_TELEMETRY_DISABLED: "1",
    PORT: String(PORT),
  };
  // Tests that need to look at or arrange data connect to the same database.
  process.env["UAT_DATABASE_URL"] = databaseUrl;

  let server: ChildProcess | undefined;

  try {
    run(
      "migrate",
      "npm",
      ["run", "db:migrate", "-w", "@song-lists/db"],
      REPO,
      env,
    );

    if (process.env["UAT_SKIP_BUILD"] !== "1") {
      run("build", "npx", ["next", "build", "--webpack"], APP, env);
    }

    server = spawn("npx", ["next", "start", "--port", String(PORT)], {
      cwd: APP,
      env,
      stdio: [
        "ignore",
        openSync(`${LOGS}/server.log`, "w"),
        openSync(`${LOGS}/server.log`, "a"),
      ],
      detached: true,
    });

    await waitForServer(server);
  } catch (error) {
    await stop(server, container);
    throw error;
  }

  return () => stop(server, container);
}

async function stop(
  server: ChildProcess | undefined,
  container: { stop: () => Promise<unknown> },
): Promise<void> {
  if (server?.pid !== undefined && server.exitCode === null) {
    // The server was started in its own process group, so one signal ends
    // `npx`, `next`, and whatever they started.
    process.kill(-server.pid, "SIGTERM");
  }

  await container.stop();
}

export default globalSetup;
