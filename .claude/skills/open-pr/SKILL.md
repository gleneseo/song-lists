---
name: open-pr
description: Commit outstanding changes onto a feature branch and open a pull request using this org's PR template, including the complete output of `npm run proof`. Use when the user asks to "open a PR", "ship this", "create a pull request", "commit and PR", or runs `/open-pr`.
---

# /open-pr — commit, branch, and open a pull request

Automates the "ship it" flow: commit whatever is outstanding onto a proper
feature branch, then open a PR that follows this org's template to the
letter — including the complete output of `npm run proof`, not just the
commit hash.

## Step 1 — commit outstanding changes onto a feature branch

1. Run `git status` and `git branch --show-current`.
2. Determine the default branch (`git symbolic-ref refs/remotes/origin/HEAD`,
   falling back to `master`/`main` if unset). **Never commit directly to the
   default branch.** If the current branch IS the default branch, create and
   check out a new feature branch before committing anything — even if
   there's nothing to commit yet, a PR still needs a non-default branch to
   exist.
   - Name the branch `<type>/<kebab-summary>` (e.g. `fix/handle-empty-input`),
     using the same `type` values as [AGENTS.md](../../../AGENTS.md)'s
     Conventional Commits section (`feat`, `fix`, `chore`, `docs`, `style`,
     `refactor`, `perf`, `test`, `build`, `ci`).
   - If already on a non-default feature branch, stay on it.
3. If the working tree is clean and the current branch has no commits ahead
   of the default branch, stop and tell the user there is nothing to open a
   PR for. If the tree is clean but the branch already has commits ahead of
   default, skip straight to Step 2.
4. Stage and commit the outstanding changes, following AGENTS.md's
   Conventional Commits format (`<type>[optional scope]: <description>`).
   Don't skip hooks (no `--no-verify`); if husky/lint-staged/commitlint
   rejects the commit, fix the underlying issue and recommit.
5. Push the branch: `git push -u origin <branch>`.

## Step 2 — find the pull request template

Don't rely on what happens to be in the session's working directories or on
memory: run these checks, in order, and use the first template found. Run
them from the repository root (`git rev-parse --show-toplevel`).

1. **This repo.** Look for `.github/PULL_REQUEST_TEMPLATE.md`,
   `.github/pull_request_template.md`, `docs/pull_request_template.md`,
   `PULL_REQUEST_TEMPLATE.md`, or `pull_request_template.md`, or a
   `.github/PULL_REQUEST_TEMPLATE/` folder (if it holds several, pick the
   one that fits, or ask).
2. **The org's `.github` repo, checked out next to this one.** The org-wide
   default lives in a repo named `.github`, and GitHub falls back to it for
   any repo without its own template. Here it is normally a sibling of the
   repository folder, so check
   `../.github/.github/PULL_REQUEST_TEMPLATE.md` (and the lowercase
   spelling) relative to the repo root. Also check the session's other
   working directories for a `.github`-named repo.
3. **The org's `.github` repo on GitHub.** If there's no local copy, fetch it
   with the owner taken from the remote:

   ```bash
   owner=$(gh repo view --json owner -q .owner.login)
   gh api -H "Accept: application/vnd.github.raw" \
     "repos/$owner/.github/contents/.github/PULL_REQUEST_TEMPLATE.md"
   ```

   Try the lowercase file name too if that returns a 404.

Use the template exactly as found; it counts as "the template" for this repo
whichever of the three it came from. Only if all three come up empty, **stop
and alert the user**, saying which locations were checked — do not invent a
template or write a PR body from scratch.

## Step 3 — open the pull request

Follow the template's own inline directions (its HTML comments) exactly, then
remove the comments from the final body. In particular:

- **Proof section**: this repo has a `package.json`, so it's a Node project
  and this section is required, not omittable. Run `npm run build`. If it
  fails, stop and tell the user rather than opening a PR with a broken build.
  If it succeeds, run `npm run proof` and paste its **complete stdout** into
  the fenced code block — the script pipes the commit hash through `cowsay`,
  so the full ASCII-art output belongs in the PR verbatim, not just the raw
  hash.
- Leave Checklist items unchecked unless you've personally verified one in
  this session.

### Label

Based on the overall nature of the change (the Conventional Commit `type`
used in Step 1 is a good signal, but judge by the actual diff, not just the
prefix), apply exactly one label:

| Change is primarily...                           | Label           |
| ------------------------------------------------ | --------------- |
| a bug fix (`fix`)                                | `bug`           |
| documentation-only (`docs`)                      | `documentation` |
| a new feature (`feat`)                           | `enhancement`   |
| anything else (`chore`, `refactor`, `test`, ...) | _(no label)_    |

Only apply a label that already exists in the repo — check with
`gh label list`. If the matching label doesn't exist, mention that to the
user instead of creating one or guessing a substitute.

Create the PR with:

```bash
gh pr create --title "<type>: <summary>" --base <default-branch> --head <feature-branch> \
  --label "<bug|documentation|enhancement>" \
  --body "$(cat <<'EOF'
<filled-in template>
EOF
)"
```

Omit `--label` entirely when no label applies. Use the heredoc for `--body`
so formatting — especially the proof fenced block — survives intact. Report
the resulting PR URL back to the user.
