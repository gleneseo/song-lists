# song-lists

Songs and lists

## Requirements

- Node.js `>=24 <25`
- npm `^12.0.2`
- A running Docker daemon — required by the integration tests, and therefore by `npm test`, `npm run test:coverage`, and `npm run build`. See [Testing](#testing).

## Getting started

```sh
npm install
```

## Scripts

| Script                     | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `npm run build`            | Clean, check formatting, lint, compile, and test.      |
| `npm run build:tsc`        | Compile TypeScript.                                    |
| `npm test`                 | Run every test project. Requires Docker.               |
| `npm run test:coverage`    | Run every test project with coverage. Requires Docker. |
| `npm run test:unit`        | Run the unit project only. No Docker required.         |
| `npm run test:integration` | Run the integration project only. Requires Docker.     |
| `npm run lint`             | Run ESLint.                                            |
| `npm run prettier:check`   | Check formatting.                                      |
| `npm run prettier:write`   | Apply formatting.                                      |
| `npm run clean`            | Remove build and coverage output.                      |

## Testing

The suite is split into two [vitest projects](https://vitest.dev/guide/projects):

- **unit** (`tests/unit/**/*.test.ts`) — pure, fast, no external dependencies.
- **integration** (`tests/integration/**/*.test.ts`) — starts real services in throwaway containers via [Testcontainers](https://node.testcontainers.org/).

### Docker requirement

The integration project talks to a Docker daemon over its socket to pull images, start containers, map ports, and tear them down. There is no embedded fallback: with no reachable daemon, the containers fail to start and every integration test fails with them.

`npm test`, `npm run test:coverage`, and `npm run build` all run **every** project, so all three require a running daemon. Any Docker-compatible runtime works — Docker Desktop, Colima, Podman exposing a Docker socket, or a remote host via `DOCKER_HOST`. CI needs a Docker-capable runner.

Use `npm run test:unit` to run the unit project without Docker.

The first run on a machine pays the container image pull, so expect the first integration run to be slower than later ones.

### Shared containers

Containers are started from a [`globalSetup`](https://vitest.dev/config/#globalsetup) registered on the integration project, which runs once in the vitest main process before any test worker spawns. Every integration test file therefore shares **one** container per run, rather than each suite or file starting its own.

Connection details are published with `project.provide()` and read in tests with `inject()`:

```ts
import { inject } from "vitest";

const postgres = inject("postgres");
```

The type of each provided value comes from the `ProvidedContext` interface augmented in `tests/integration/setup/postgres.ts`. Values must be structured-cloneable, so tests receive plain connection details rather than the container handle itself.

Because the container is shared, integration tests are **not** isolated from each other's data. Tests that write to Postgres are responsible for their own isolation — use a schema per file, or truncate what you touched.

This is separate from [Docker Compose](#docker-compose) below — the integration tests manage their own containers on random ports and do not use the Compose services.

### Coverage

Coverage is configured once at the root of `vitest.config.ts` and is measured **across all projects**, not per project. The 100% threshold is evaluated against the union of what every project exercises in `src`, so a line covered only by an integration test counts the same as one covered only by a unit test.

Because of that, only `npm run test:coverage` (and `npm run build`, which calls it) produces meaningful numbers. Running a single project does not collect coverage, since one project's figures would be checked against a threshold that assumes all of them. Note that plain `npm test` does not enforce the threshold either — a green `npm test` is not a guarantee that `npm run build` will pass.

## Docker

The `Dockerfile` builds a production image: it compiles TypeScript in a build stage, installs production-only dependencies in a separate stage, then assembles a minimal runtime image that runs as the non-root `node` user.

### Build the image

```sh
docker build -t gleneseo-ts-template:latest .
```

### Run the container

```sh
docker run --rm gleneseo-ts-template:latest
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

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). See [AGENTS.md](./AGENTS.md) for details.
