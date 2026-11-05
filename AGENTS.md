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

### Why apps/web-next opts out of the shared tsconfig/eslint config

`tsconfig.base.json` targets Node (no DOM lib) and is `composite` for the
`tsc -b` graph; a Next.js app needs the DOM lib, `jsx: "react-jsx"`,
`moduleResolution: "bundler"`, and Next's own `plugins`/`.next/types`
includes, and type-checks itself rather than building via `tsc -b`. So
`apps/web-next` keeps its own standalone `tsconfig.json`, excluded
from the root `tsconfig.json`'s project references, with its own
`typecheck` script wired into the root `build` chain instead (see
`apps/web-next/package.json` and the root `package.json`'s
`typecheck:web-next`).

`apps/web-next` also keeps its own `eslint.config.mjs` (via
`eslint-config-next`), for React/JSX-aware linting the
root config was never designed to give `.tsx` files. ESLint 10+ resolves
the _nearest_ config file per linted file, so that nested config already
applies to `apps/web-next`'s files regardless of what the root does --
but the root config still adds `apps/web-next/**` to its `ignores`, so that
root's `eslint .` doesn't lint those files a second time under the wrong
config, since `lint:eslint:web-next` already covers them.

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

### How `lib/` is organized in apps/web-next

`lib` isn't a Next.js convention -- Next only cares about `app/` (or
`pages/`), `public/`, and optionally `src/`. It's a shadcn/ui convention:
`components.json`'s `aliases` hardcodes `"lib": "@/lib"` and
`"utils": "@/lib/utils"`, so renaming it fights the `shadcn` CLI. Left
alone, though, `lib` is just "everything that isn't a component," which is
exactly ambiguous enough to become a junk drawer.

The dividing lines that actually hold up: `app/` is route entry points
Next's router recognizes (`page.tsx`, `layout.tsx`, ...); `components/` is
anything that returns JSX (`components/ui/` for vendored shadcn
primitives, everything else for this app's own composed components);
`hooks/` (a separate top-level alias in `components.json`, sibling to
`lib/`, not nested inside it) is for custom React hooks. `lib/` is what's
left: data access, domain logic, config, clients -- and it should never
hold a flat file directly, only purpose-named subfolders, so that purpose
stays legible instead of implicit. `apps/web-next/lib` currently has
`queries/` (talks to a live database; excluded from the coverage
`include` in the root `vitest.config.ts`) and `search/` (pure app logic;
covered). New code goes into an existing subfolder if it fits, or a new
purpose-named one -- never loose in `lib/` itself.

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

## Exports

A file with exactly one export -- which will be often -- should always
prefer exporting it inline (`export default function Page() {...}`,
`export function filterSongs() {...}`). A file with more than one
export instead defines each one first and groups them together in a
single `export { ... }` (and `export default name;`) block at the
bottom, rather than scattering them across several export sites.

`packages/*` and `apps/cli` enforce the always-grouped form via the root
`eslint.config.mjs`'s `no-restricted-syntax` rule, with no single-export
exception. `apps/web-next` can't use that shared config (see above) and
follows the same convention by hand instead, with the single-export
preference applied. The one exception regardless of export count is
vendored or CLI-generated code -- currently `components/ui/*` in
`apps/web-next`, generated by the `shadcn` CLI -- which keeps whatever
shape the tool itself produces, so future `npx shadcn add <component>`
output doesn't look inconsistent with what's already there.

## Test conventions

All tests should be defined in files that have the `.test.ts` extension, and should
follow these conventions:

1. Test names for `describe()` functions should match the primary object or concept under test,
   which is usually the same as the filename before any file extensions.
2. Test names for `it()` functions need to begin with "should".
3. Test names should avoid referencing code objects in an effort to be understood
   by the widest audience, that doesn't always include software engineers.

## Browser (UAT) tests

`tests/uat/` holds browser tests (Playwright, driving the installed Chrome) that
prove the app's usage paths work as a person would use them. They are the last
stage after the unit and integration tests, and they are part of the work, not
an afterthought. Whenever you add or change UI -- a page, a form, a button, a
link, a menu, a modal, a label, a sort or filter, a role's permissions, the
layout on a phone -- take them into account in the same change:

1. Find the spec that covers the area (`auth`, `navigation`, `dashboard`,
   `lists`, `modals`, `add-song`, `editing`, `users`, `account`,
   `full-pages`, `sessions-and-layout`) and update any test the change
   affects, so it still says what the app now does.
2. Add tests for new behavior, including who can and can't do it (admin,
   manager, user) and what happens when it goes wrong. A new page also goes
   in `full-pages.spec.ts` so it is opened directly, not only by clicking.
3. Run the affected specs before calling the work done:
   `npm run test:uat -- <spec name>`. After a change to the app, the
   build must be redone, so leave `UAT_SKIP_BUILD` unset; it reuses the
   last build and would test the old code. Run the whole suite
   (`npm run test:uat`) when a change reaches shared things like the top bar,
   the shared `Button`, or the layout.

How they are written:

- They are `*.spec.ts` files, not `*.test.ts`, and the naming rules under
  "Test conventions" do not apply; names read as what a person does or sees.
- Find things the way a person or assistive technology would, by role and
  accessible name (`getByRole`); a top-bar link is a link. Reach for a CSS
  selector only when the page offers nothing better.
- Use the helpers in `support/` (`as(role)` to be signed in as the seed
  admin, manager, or user; `arrangeSong` and `idOf` for data of your own).
  Each test arranges its own data and doesn't rely on another test's.
- An uncaught page error or a 5xx response fails a test. Don't silence one
  for a whole file; where one is truly expected, allow it for those tests
  only, with a comment saying why.
- A real gap found by a test is fixed, or marked `test.fixme` with a comment
  saying what is wrong and when to remove the `fixme`. Never delete a test
  to make a run pass.

## Code documentation

IMPORTANT: Code documentation must follow [TSDoc](https://tsdoc.org/) conventions.

Documentation strings must never end in a `.`, unless they include multiple phrases (e.g. multiple sentences), in which case every phrase, including the last, ends in a `.`.
