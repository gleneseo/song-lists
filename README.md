# song-lists

Songs and lists

## Requirements

- Node.js `>=24 <25`
- npm `^12.0.2`
- A running Docker daemon — required by the integration tests, and therefore by `npm test`, `npm run test:coverage`, and `npm run build`. See [Testing](#testing). Building an app's Docker image (e.g. `npm run docker:build -w @song-lists/cli`) also needs one.

## Getting started

```sh
npm install
```

## Workspace layout

This repository is an [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) monorepo. Shared libraries live in `packages/*`; deployable applications live in `apps/*`.

| Path            | Package                | Role                                                      |
| --------------- | ---------------------- | --------------------------------------------------------- |
| `packages/db`   | `@song-lists/db`       | Drizzle schema, the `createDb` factory, and `migrations/` |
| `packages/auth` | `@song-lists/auth`     | Better Auth's `createAuth` factory over `@song-lists/db`  |
| `apps/cli`      | `@song-lists/cli`      | The Effect CLI and its Docker image                       |
| `apps/web-next` | `@song-lists/web-next` | The Next.js frontend                                      |

Internal packages point their `exports` at TypeScript source, so nothing needs a build step before tests or `tsx` can run. `npm run build:tsc` runs `tsc -b` over the whole project graph for type-checking. Target one workspace with `-w`, e.g. `npm run test:unit -w @song-lists/db`.

Web frontends are named `apps/web-<stack>` (e.g. `apps/web-next`, with `apps/web-htmx` planned) rather than a single `apps/web`, since more than one is expected to exist side by side. Each keeps its own `tsconfig.json` and `eslint.config.mjs` instead of the shared ones — see [AGENTS.md](./AGENTS.md#why-nextjs-apps-opt-out-of-the-shared-tsconfigeslint-config) for why.

### `@song-lists/web-next`

A single page that lists every song in the catalog and lets you narrow it by typing — no auth, no other routes yet. Next.js 16 (App Router), Tailwind v4, and shadcn's "base-nova" style.

```sh
docker compose up -d               # if it isn't already running
cp apps/web-next/.env.example apps/web-next/.env.local
DATABASE_URL="postgres://postgres:postgres@localhost:5432/default" npm run db:migrate
npm run dev -w @song-lists/web-next
```

Open [http://localhost:3000](http://localhost:3000). `npm run build -w @song-lists/web-next` / `npm run start -w @song-lists/web-next` build and run it for production; neither is part of the root `npm run build`, which stays independent of a live database.

### Song art and album lookups

A song's details show its album art, album, year, and a YouTube link. The art, album, and year come from two free services, asked together by title and artist: iTunes, and MusicBrainz with the Cover Art Archive (which knows records iTunes doesn't sell). They are stored in the `song_metadata` table. A song on an album of its own beats one on a single or compilation; of two albums, the one that came out first wins, and a tie goes to iTunes. MusicBrainz judges a release by its own type, so live albums, remixes and DJ mixes are never taken for it, and its year is the album's true first release. An album's name is saved without its edition ("Insomniac", not "Insomniac (25th Anniversary Deluxe Edition)"). A song gets its lookup automatically when it is added, in the background, so adding a song never waits on either service or fails because of them. Tribute and karaoke acts are never taken for the real artist; a song with no confident match shows nothing rather than the wrong art.

The seed data ships with the results already in (`0004_seed_song_details.sql`), so a fresh `npm run db:reset` needs no lookup. Use the `backfill-metadata` command to look up songs that have none, such as songs added in bulk since:

```sh
npm start -w @song-lists/cli -- backfill-metadata --dry-run       # how many songs, and about how long
npm start -w @song-lists/cli -- backfill-metadata                 # look them up
npm start -w @song-lists/cli -- backfill-metadata --report results.csv
```

| Option              | Description                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `--dry-run`         | Only say how many songs would be looked up.                                                          |
| `--limit <n>`       | Look up no more than `n` songs.                                                                      |
| `--retry-not-found` | Also look up again the songs nothing was found for (after tuning the matching in `song-metadata`).   |
| `--report <path>`   | When the run ends, write every song's lookup result to `path` as CSV, for spreadsheets or `sqlite3`. |

- **Pace:** about one song every 3.3 seconds, to stay within iTunes' and MusicBrainz's limits (about 5¼ hours for the whole catalog). Each result is saved as it arrives.
- **Stopping:** Ctrl-C finishes the song in hand and prints a summary, including the songs nothing was found for; Ctrl-C again stops at once. Running it again carries on from where it stopped. It also stops by itself after 5 failures in a row, and songs that failed are tried again on the next run.
- **Needs** `DATABASE_URL` (read from the nearest `.env`). It runs from a checkout, not the CLI's Docker image, which doesn't include the database packages.
- **Switching it off:** set `SONG_METADATA_LOOKUP=off` to skip the automatic lookup when songs are added (the UAT suite does this).
- **Browsing the results:** `npm run db:studio` and open `song_metadata`.

## Scripts

Run these from the repository root.

| Script                     | Description                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run build`            | Clean, check formatting, lint, type-check (`tsc -b`), test with coverage, proof. Requires Docker.                |
| `npm run build:tsc`        | Type-check every package and app (`tsc -b`).                                                                     |
| `npm test`                 | Run every test project. Requires Docker.                                                                         |
| `npm run test:coverage`    | Run every test project with coverage. Requires Docker.                                                           |
| `npm run test:unit`        | Run the per-package `unit-*` projects only. No Docker required.                                                  |
| `npm run test:integration` | Run the `integration` project only. Requires Docker.                                                             |
| `npm run lint`             | Run ESLint across the workspace.                                                                                 |
| `npm run prettier:check`   | Check formatting.                                                                                                |
| `npm run prettier:write`   | Apply formatting.                                                                                                |
| `npm run clean`            | Remove build and coverage output from every workspace.                                                           |
| `npm run db:generate`      | Generate migrations from the schema (delegates to `@song-lists/db`; needs `DATABASE_URL`).                       |
| `npm run db:migrate`       | Apply pending migrations to the database at `DATABASE_URL`. Idempotent — already-applied migrations are skipped. |
| `npm run db:reset`         | **Destructive.** Drop the app schema and re-apply every migration, leaving only migration data. Localhost only.  |
| `npm run db:docs`          | Regenerate `packages/db/docs/schema.md` from the schema.                                                         |
| `npm run db:studio`        | Open Drizzle Studio in the browser, on this machine only, for the database at `DATABASE_URL`. It can edit rows.  |

Each app owns its own Docker scripts, e.g. `npm run docker:build -w @song-lists/cli`.

## Testing

Every package and app has its own **`unit-<name>`** vitest project (`<workspace>/tests/unit/**/*.test.ts`) — pure, fast, no external dependencies. A single root **`integration`** project starts real services in throwaway containers via [Testcontainers](https://node.testcontainers.org/) and checks that the pieces work together: the packages against each other and the real schema (`tests/integration/**/*.test.ts`), and the web app's own queries and actions against a real, seeded database (`apps/web-next/tests/integration/**/*.test.ts`).

`npm run test:unit` runs every `unit-*` project (the `unit-*` glob excludes `integration`), so it needs no Docker.

### Docker requirement

The integration project talks to a Docker daemon over its socket to pull images, start containers, map ports, and tear them down. There is no embedded fallback: with no reachable daemon, the containers fail to start and every integration test fails with them.

`npm test`, `npm run test:coverage`, and `npm run build` all run **every** project, so all three require a running daemon. Any Docker-compatible runtime works — Docker Desktop, Colima, Podman exposing a Docker socket, or a remote host via `DOCKER_HOST`. CI needs a Docker-capable runner.

Use `npm run test:unit` to run the `unit-*` projects without Docker.

The first run on a machine pays the container image pull, so expect the first integration run to be slower than later ones.

### Shared containers

Containers are started from a [`globalSetup`](https://vitest.dev/config/#globalsetup) registered on the integration project, which runs once in the vitest main process before any test worker spawns. Every integration test file therefore shares **one** container per run, rather than each suite or file starting its own.

Connection details are published with `project.provide()` and read in tests with `inject()`:

```ts
import { inject } from "vitest";

const postgres = inject("postgres");
```

The type of each provided value comes from the `ProvidedContext` interface augmented in `tests/integration/setup/postgres.ts`. Values must be structured-cloneable, so tests receive plain connection details rather than the container handle itself.

### A database for each test file

The container's database is migrated once, in the `globalSetup`, into a **template** database holding the schema and all the seed data. A test file that writes asks for a copy of its own with `createIsolatedDatabase()` (`tests/integration/support/isolated-database.ts`), which is a quick `CREATE DATABASE ... TEMPLATE` — so files run in parallel, start from the same realistic data, and can change it freely without cleaning up after themselves.

The web app's tests go one step further. `openAppDatabase()` (`apps/web-next/tests/integration/support/app-database.ts`) points the app's `DATABASE_URL` at that copy, and the test then imports the real `@/lib/queries/*` and `@/lib/actions/*` with `await import(...)` so they pick it up. Only the signed-in user is faked, by mocking `getSession`; Better Auth, the Drizzle schema, and the SQL are all real. Check what an action did with plain SQL through the pool `openAppDatabase()` returns, and prefer an independent query as the expected value over restating the app's own SQL.

This is separate from [Docker Compose](#docker-compose) below — the integration tests manage their own containers on random ports and do not use the Compose services.

### Coverage

Coverage is configured once at the root of `vitest.config.ts` and is measured **across all projects**, not per project. The 100% threshold is evaluated against the union of what every project exercises in `packages/*/src` and `apps/*/src`, so a line covered only by an integration test counts the same as one covered only by a unit test.

Because of that, only `npm run test:coverage` (and `npm run build`, which calls it) produces meaningful numbers. Running a single project does not collect coverage, since one project's figures would be checked against a threshold that assumes all of them. Note that plain `npm test` does not enforce the threshold either — a green `npm test` is not a guarantee that `npm run build` will pass.

## Docker

Each app carries its own `Dockerfile`. The build context is the repository root so the workspace install resolves, and `npm run build` does **not** build any image — that is a per-app step.

### `@song-lists/cli`

`apps/cli/Dockerfile` compiles TypeScript in a build stage, installs production-only dependencies in a separate stage, then assembles a minimal runtime image that runs as the non-root `node` user. `ENTRYPOINT` runs `node dist/index.js`, so any arguments passed to `docker run` after the image name are forwarded to the CLI rather than replacing the entrypoint.

```sh
npm run docker:build -w @song-lists/cli
```

which is equivalent to:

```sh
docker build . --file apps/cli/Dockerfile --tag song-lists:latest
```

Run it:

```sh
npm run docker:run -w @song-lists/cli
```

Pass CLI arguments after the image name, e.g. to run the `echo` subcommand:

```sh
docker run --rm song-lists:latest echo foobar
```

## Docker Compose

`docker-compose.yml` provisions local Postgres and Redis instances for development.

### Start services

```sh
docker compose up
```

Add `-d` to run in the background:

```sh
docker compose up -d
```

### Stop services

```sh
docker compose down
```

### Services

- **postgres** — Postgres 18, exposed on `localhost:5432` (override with `POSTGRES_PORT`). Credentials and database name default to `postgres` / `postgres` / `default`, configurable via `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.
- **redis** — Redis 8, exposed on `localhost:6379` (override with `REDIS_PORT`).

Override any of these by setting environment variables in your shell or in a `.env` file next to `docker-compose.yml`.

Data is persisted to `.data/postgres` and `.data/redis` on the host, so it survives container restarts. Delete those directories to reset a service to a clean state.

Once Postgres is up, apply the schema (and its seed data) with `npm run db:migrate`. Drizzle tracks each applied migration's hash in a `drizzle.__drizzle_migrations` table, making it idempotent — re-running it once everything is applied is a no-op, so it's safe to run any time, not just on a fresh database.

This is entirely separate from the integration tests: they start their own throwaway Postgres via Testcontainers on a random port (see [Testing](#testing)), migrate it from scratch, and tear it down afterward. Running the test suite never touches — and never refreshes — the docker-compose database that `@song-lists/web-next` and local tooling read from.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). See [AGENTS.md](./AGENTS.md) for details.
