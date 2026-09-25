# AGENTS.md

## Workspace layout

This repository is an npm-workspaces monorepo.

| Path            | Package                | Role                                                      |
| --------------- | ---------------------- | --------------------------------------------------------- |
| `packages/db`   | `@song-lists/db`       | Drizzle schema, `createDb` factory, and the `migrations/` |
| `packages/auth` | `@song-lists/auth`     | Better Auth `createAuth` factory over `@song-lists/db`    |
| `apps/cli`      | `@song-lists/cli`      | The Effect CLI and its Docker image                       |
| `apps/web-next` | `@song-lists/web-next` | The Next.js frontend                                      |

Internal packages resolve to their TypeScript source (`exports` points at
`src/index.ts`); `tsc -b` from the root type-checks the whole graph. Run a
single workspace's scripts with `npm run <script> -w @song-lists/<name>`.

Web frontends are named `apps/web-<stack>` (`apps/web-next` today, an
`apps/web-htmx` planned) rather than a single `apps/web`, since more than
one is expected to exist side by side.

Schema migrations live in `packages/db/migrations`; generate them with
`npm run db:generate` (needs `DATABASE_URL`).

### Why Next.js apps opt out of the shared tsconfig/eslint config

`tsconfig.base.json` targets Node (no DOM lib) and is `composite` for the
`tsc -b` graph; a Next.js app needs the DOM lib, `jsx: "react-jsx"`,
`moduleResolution: "bundler"`, and Next's own `plugins`/`.next/types`
includes, and type-checks itself rather than building via `tsc -b`. The root
`eslint.config.mjs` also bans inline default exports, which conflicts with
Next's `export default function Page() {...}` convention for every
page/layout. So each `apps/web-*` app keeps its own standalone
`tsconfig.json` and `eslint.config.mjs` (via `eslint-config-next` or the
equivalent), is excluded from the root eslint config's `ignores` and from
the root `tsconfig.json`'s project references, and gets its own
`typecheck`/`lint` scripts wired into the root `build`/`lint` chains instead
(see `apps/web-next/package.json` and the root `package.json`'s
`typecheck:web-next`/`lint:eslint:web-next` scripts).

`apps/web-next` also pins its own `eslint` devDependency (currently `^9`)
rather than using the root's hoisted version: `eslint-config-next`'s bundled
`eslint-plugin-react` isn't yet compatible with ESLint 10 (a real crash --
`context.getFilename is not a function` -- not just an unmet peer-range
warning). npm installs the pinned version into `apps/web-next/node_modules`
instead of hoisting, so `npm run lint -w @song-lists/web-next` resolves it
correctly. Bump this once `eslint-config-next` catches up.

### Why apps/web-next is pinned to webpack, not Turbopack

Every `@song-lists/*` package is consumed as raw TypeScript source and, like
the rest of the monorepo, writes relative imports with an explicit `.js`
extension that resolves to a sibling `.ts` file (required for plain
`tsc`/`tsx`/Node ESM). Turbopack has no supported way to apply that mapping
to a `node_modules`-resolved package (its `resolveExtensions`/`resolveAlias`
config explicitly excludes `node_modules`); webpack can, via a custom
`resolve.extensionAlias` added in `apps/web-next/next.config.ts`'s
`webpack()` hook. So this app's `dev`/`build` scripts pass `--webpack`
explicitly rather than using Next 16's Turbopack default.

Relatedly, `@song-lists/db`'s migration runner (`runMigrations`,
`migrationsFolder`) is exported from a separate `@song-lists/db/migrate`
subpath rather than the main package entry point. It resolves a filesystem
path via `new URL(..., import.meta.url)` at module scope, which a bundler
tries to statically resolve as an asset/module reference and fails on --
harmless for Node-only consumers (tests, tooling), but it would break any
bundler-based consumer that merely imports the main barrel, whether or not
it ever calls `runMigrations`. Keeping it off the main entry point also
means a web app can't accidentally ship the ability to run migrations.

## Vendored package sources

The following repositories are cloned locally for reference. Use them to explore APIs, find usage examples, and
understand implementation details when the documentation isn't enough.

| Package                                   | Local path                           |
| ----------------------------------------- | ------------------------------------ |
| Effect v4                                 | `~/.local/share/vendors/effect`      |
| Drizzle ORM (also contains `drizzle-kit`) | `~/.local/share/vendors/drizzle`     |
| Better Auth                               | `~/.local/share/vendors/better-auth` |
| Next.js                                   | `~/.local/share/vendors/next`        |

## Commit messages

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) convention:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common `type` values: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`.

Use `!` after the type/scope (or a `BREAKING CHANGE:` footer) to indicate a breaking change.

## Branching

Never commit directly to `master`. All changes must go through a pull request from a feature branch.

## Git stash

Any `git stash` operation must include untracked files (i.e. pass `-u`/`--include-untracked`).

## Test conventions

All tests should be defined in files that have the `.test.ts` extension, and should
follow these conventions:

1. Test names for `describe()` functions should match the primary object or concept under test,
   which is usually the same as the filename before any file extensions.
2. Test names for `it()` functions need to begin with "should".
3. Test names should avoid referencing code objects in an effort to be understood
   by the widest audience, that doesn't always include software engineers.

## Code documentation

IMPORTANT: Code documentation must follow [TSDoc](https://tsdoc.org/) conventions.

Documentation strings must never end in a `.`, unless they include multiple phrases (e.g. multiple sentences), in which case every phrase, including the last, ends in a `.`.
