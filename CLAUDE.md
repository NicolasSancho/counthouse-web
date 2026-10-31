@AGENTS.md

# counthouse-web

Web app for Counthouse, a back office, built with Next.js.

## Stack

Next.js 16 (App Router, Cache Components, typed routes), React 19, TypeScript (strict), Tailwind
CSS v4, npm, Node 24 (`.nvmrc`).

## Commands

The scripts are listed in the [README](README.md#scripts). CI runs all of them on every pull
request, so run them locally before opening one.

## Structure

- `src/app`: routes, layouts and the loading and error files. Pages compose features and hold no
  business logic.
- `src/features/<feature>`: components, server actions, queries, schemas and tests for one area of
  the product.
- `src/server`: code that runs only on the server: the API client, session handling, the data
  access layer and environment parsing. Only this layer reads `process.env`.
- `src/shared`: UI and pure helpers that several features use. It imports nothing from the other
  folders. Move code here when a second feature needs it.
- Dependencies point one way: `app` to `features` to `shared` and `server`, and a feature does not
  import another feature. ESLint enforces this and the `process.env` rule (`eslint.config.mjs`).
- Create a folder when its first file exists. Do not add barrel files.

## Conventions

- Server Components by default. Add `"use client"` only for state, effects or browser APIs, and
  keep the client part small.
- No `any`. `noUncheckedIndexedAccess` is on, so handle `undefined` instead of asserting.
- Links use typed routes, so a broken route fails `typecheck`.
- Secrets stay out of the repo. `.env*` is ignored.
- Tooling changes go in their own pull request.

## Testing

- Vitest covers logic that does not need a browser. Pages are covered by Playwright against the
  production build, including an axe check (WCAG A and AA) in light and dark.
- Show a new test failing by breaking the code once before trusting it.
- Server and client behavior is checked in a real Next build, not in jsdom.

## Git

- Branches come from `main`: `feat/`, `fix/`, `docs/` or `chore/`, in kebab-case.
- Commits follow Conventional Commits, in the imperative, 72 characters or fewer. One concern per
  commit.
- Changes go through a pull request with green CI. Pull requests are squash-merged, so the title
  becomes the commit on `main`. A workflow checks it.

## API contract

The OpenAPI contract belongs to `counthouse-api` and changes there by pull request, before any
code that depends on it. It has not been added there yet, so this repo has no pinned copy and no
generated types today. Once it exists, this repo keeps a pinned copy and generates types from it.
Never edit generated files by hand.

Planned and not set up yet (see [ADR 0005](docs/adr/0005-contract-pin-and-mock-server.md)):

- Generate the types with `openapi-typescript <pinned contract> --default-non-nullable false`. The
  flag is required: without it a schema default makes a request field required in the generated
  type.
- Call the API with `openapi-fetch`, from `src/server` only.
- `API_MODE=mock|live` is set per deployment. In mock mode the app answers its own API calls from a
  mock server built from the contract. There is no fallback from live to mock at runtime.
- Update the pinned copy after the contract change has merged in `counthouse-api`.

## UI library

Shared components come from
[`@nicolassancho/storybook-core`](https://www.npmjs.com/package/@nicolassancho/storybook-core)
([Storybook](https://nicolassancho.github.io/Storybook-core/)). Install it from npm; `npm link` is
only for trying an unreleased change and is never committed. Fix a missing or wrong component in
the library first, release it, then upgrade here. Never copy or fork library code. Only
app-specific layout and screens live in this repo.

- With `typedRoutes` on, Next.js rejects `next/link` passed directly as a library `LinkComponent`:
  its `href` is typed as a known route and the library passes a string. Wrap `Link` once in a small
  component that casts `href`, and pass the wrapper (see the library's Consumers guide).
