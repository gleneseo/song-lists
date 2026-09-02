# AGENTS.md

## Workspace layout

This repository is an npm-workspaces monorepo.

| Path              | Package              | Role                                                        |
| ----------------- | -------------------- | ----------------------------------------------------------- |
| `packages/domain` | `@song-lists/domain` | Shared types and Effect Schema validation. No internal deps |
| `packages/db`     | `@song-lists/db`     | Drizzle schema, `createDb` factory, and the `migrations/`   |
| `packages/auth`   | `@song-lists/auth`   | Better Auth `createAuth` factory over `@song-lists/db`      |
| `apps/cli`        | `@song-lists/cli`    | The Effect CLI and its Docker image                         |

Internal packages resolve to their TypeScript source (`exports` points at
`src/index.ts`); `tsc -b` from the root type-checks the whole graph. Run a
single workspace's scripts with `npm run <script> -w @song-lists/<name>`.

Schema migrations live in `packages/db/migrations`; generate them with
`npm run db:generate` (needs `DATABASE_URL`).

## Vendored package sources

The following repositories are cloned locally for reference. Use them to explore APIs, find usage examples, and
understand implementation details when the documentation isn't enough.

| Package                                   | Local path                           |
| ----------------------------------------- | ------------------------------------ |
| Effect v4                                 | `~/.local/share/vendors/effect`      |
| Drizzle ORM (also contains `drizzle-kit`) | `~/.local/share/vendors/drizzle`     |
| Better Auth                               | `~/.local/share/vendors/better-auth` |

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
