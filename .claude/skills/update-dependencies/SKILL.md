---
name: update-dependencies
description: Update this project's outdated npm dependencies to the newest version each one's existing semver range allows (npm's "Wanted" column), then verify the workspace still builds, lints, and passes tests. Use when the user asks to "update dependencies", "update our deps", "bump dependencies", "check for outdated packages", or runs `/update-dependencies`.
---

# /update-dependencies — apply in-range dependency updates

Automates the "keep our dependencies current" flow: find every outdated
package, move each one to the newest version its declared range in
`package.json` already permits, and verify nothing broke.

This skill stays **within** the ranges in `package.json` — it never crosses a
major or otherwise out-of-range boundary. Every updated package has its
`package.json` spec rewritten to the new version (keeping the existing range
operator, e.g. `^`) so `package.json` and `package-lock.json` never drift out
of sync. It does not commit or open a PR — hand off to `/open-pr` for that.

## Step 1 — list what's outdated

Run `npm outdated --json || true`. `npm outdated` exits non-zero whenever
anything is outdated, so ignore the exit code and read the output.

Each entry has `current`, `wanted`, and `latest`:

- `wanted` newer than `current` → an in-range update this skill applies.
- only `latest` newer than `wanted` → a major/out-of-range upgrade this
  skill does **not** apply; collect these to mention at the end.

If nothing has `wanted` ahead of `current`, tell the user the in-range
dependencies are current (noting any out-of-range majors available) and stop.

## Step 2 — set aside Effect packages

Drop `effect` and every `@effect/*` package from the update set. Those go
through [`/check-effect-update`](../check-effect-update/SKILL.md), which
reviews the changelogs between versions for breaking changes. Note which
packages were held back for that reason.

## Step 3 — report the plan

Print a short table of the remaining in-range updates: package name,
`current` → `wanted`, and whether it sits in `dependencies` or
`devDependencies`. No confirmation needed — this mirrors a routine
patch/minor bump — proceed straight to Step 4.

## Step 4 — apply

Run `npm install <pkg>@<wanted> <pkg>@<wanted> ...` for every package in the
update set, passing each one's `wanted` version explicitly. `npm install`
preserves the existing range operator, so `^1.6.26` becomes `^1.7.2`, and it
writes the same version into both `package.json` and `package-lock.json`.
Prefer one combined `npm install` — npm keeps each package in whichever
section (`dependencies` / `devDependencies`) it already occupies. Do not
hand-edit `package.json`.

`npm update` is **not** used here: it only bumps the lockfile when the
existing spec already covers the newer version, which leaves the two files
out of sync.

After it runs, confirm every target package's `package.json` spec now names
its `wanted` version. If any didn't move, re-run `npm install` for just those
packages before proceeding.

## Step 5 — verify

Run these in order, stopping at the first failure:

- `npm run build:tsc` (typecheck)
- `npm run lint`
- `npm run test` (the full suite — the integration project needs Docker for
  testcontainers; if Docker isn't running, fall back to `npm run test:unit`
  and say integration coverage was skipped)

A dependency bump can break something that only the integration tests
exercise — a library changing its expected database schema, for example — so
the unit suite alone is not enough to call a bump safe.

If a step fails: stop, report exactly what failed with the relevant output,
and leave the working tree as-is — don't guess at fixes for errors caused by
the bump, and don't auto-revert. Backing out is
`git checkout -- package.json package-lock.json && npm install`.

## Step 6 — check vendored reference clones for drift

[AGENTS.md](../../../AGENTS.md) lists local clones of some dependencies' source
(Effect, Drizzle, Better Auth, Next.js) kept for reference. For each bumped
package that has a clone listed there, compare the clone's checked-out
version (`git -C <path> describe --tags --always`) against the newly
installed version, and note any mismatch for the report.

**Never modify a vendor checkout, and never suggest a command to sync
one** — matching [`/check-effect-update`](../check-effect-update/SKILL.md),
this skill doesn't run `git` operations inside a vendor checkout. These
clones live outside the repo at `~/.local/share/vendors/`, shared across
every project on the machine that references that dependency — not owned
by this one. A clone lagging this project's newly installed version isn't
necessarily something to fix: another project may be deliberately pinned
to what the clone currently shows, or mid-investigation against it, and
moving it forward here could yank that out from under them without their
knowledge. Report the mismatch as information only — current clone
version vs. this project's new version — and leave whether and when to
move the shared clone entirely to the user, who can see what else on
their machine depends on it and this skill can't.

## Step 7 — report

On success, summarize: each package that moved and its old → new
`package.json` spec, anything held back for `/check-effect-update`, any
out-of-range major upgrades still available, and any vendored clone whose
checked-out version now differs from this project's (as information, not
a recommendation — see Step 6). Note that the changes are uncommitted and
unstaged — the user can review the diff and use `/open-pr` when ready.
