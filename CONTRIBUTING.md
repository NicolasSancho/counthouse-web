# Contributing

## Setup and checks

Setup and the list of scripts are in the [README](README.md). Before opening a pull request, run
`typecheck`, `lint`, `format:check`, `test`, `build` and `test:e2e`. CI runs the same scripts.
`npm run format` fixes formatting.

## Branches and commits

- Work on a branch from `main`: `feat/<description>`, `fix/<description>`, `docs/<description>` or
  `chore/<description>`, in kebab-case.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
  `type(scope): subject`, in the imperative, 72 characters or fewer. The types are `feat`, `fix`,
  `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` and `revert`. A `!` after the
  type or scope marks a breaking change. Use the body to explain why, when it is not obvious.
- One concern per commit and per pull request.

## Pull requests

- `main` is protected: changes go through a pull request with passing checks.
- Pull requests are squash-merged, so the PR title becomes the commit on `main` and must follow
  Conventional Commits. CI checks the title.
- Describe what changed and why, and how you checked it.
