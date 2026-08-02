# song-lists

Songs and lists

## Requirements

- Node.js `>=24 <25`
- npm `^11.13.0`

## Getting started

```sh
npm install
```

## Scripts

| Script                   | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `npm run build`          | Clean, check formatting, lint, compile, and test. |
| `npm run build:tsc`      | Compile TypeScript.                               |
| `npm test`               | Run the test suite.                               |
| `npm run test:coverage`  | Run the test suite with coverage.                 |
| `npm run lint`           | Run ESLint.                                       |
| `npm run prettier:check` | Check formatting.                                 |
| `npm run prettier:write` | Apply formatting.                                 |
| `npm run clean`          | Remove build and coverage output.                 |

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
