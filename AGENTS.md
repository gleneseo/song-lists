# AGENTS.md

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
