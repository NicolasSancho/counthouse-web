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
- The signed-in layout is `src/features/shell`, used by the `src/app/(app)` route group. Pages
  outside that group, such as sign-in, render without it.
- Create a folder when its first file exists. Do not add barrel files.

## Conventions

- Server Components by default. Add `"use client"` only for state, effects or browser APIs, and
  keep the client part small.
- No `any`. `noUncheckedIndexedAccess` is on, so handle `undefined` instead of asserting.
- Links use typed routes, so a broken route fails `typecheck`.
- Secrets stay out of the repo. `.env*` is ignored.
- Repo-wide tooling changes (linters, formatters, build, CI) go in their own pull request. A test
  helper that checks the code of the same pull request may ship with it.

## Testing

- Vitest covers logic that does not need a browser. Type tests are `*.test-d.ts` files: Vitest
  does not run them, and `npm run typecheck` fails if an assertion in them does not hold.
- Pages are covered by Playwright against the production build, including an axe check (WCAG A
  and AA) in light and dark.
- Show a new test failing by breaking the code once before trusting it.
- Server and client behavior is checked in a real Next build, not in jsdom.

## Git

- Branches come from `main`: `feat/`, `fix/`, `docs/` or `chore/`, in kebab-case.
- Commits follow Conventional Commits, in the imperative, 72 characters or fewer. One concern per
  commit.
- Changes go through a pull request with green CI. Pull requests are squash-merged, so the title
  becomes the commit on `main`. A workflow checks it.

## Decision records

Decision records follow the rules in [docs/adr/README.md](docs/adr/README.md).

## API contract

The OpenAPI contract belongs to `counthouse-api` and changes there by pull request, before any
code that depends on it. This repo keeps a pinned copy in `contract/openapi.yaml` and generates
`src/server/api/schema.d.ts` from it. Never edit either by hand. How to update the pin is in
[`contract/README.md`](contract/README.md); see also
[ADR 0005](docs/adr/0005-contract-pin-and-mock-server.md).

- `npm run contract:types` runs `openapi-typescript` with `--default-non-nullable false`. The flag
  is required: without it a schema default makes a request field required in the generated type.
  `src/server/api/schema.test-d.ts` makes `npm run typecheck` fail if it is dropped.
- Each schema is also exported under its own name (`--root-types --root-types-no-schema-prefix`).
  Import it with `import type { ProductDetail } from "@/server/api/schema"` instead of indexing
  `components["schemas"]`. Shared responses and parameters are exported with a `Response` or
  `Parameter` prefix.
- CI fails when the copy differs from the contract at the pinned commit (`npm run contract:check`)
  or when the committed types are out of date.
- Update the pinned copy after the contract change has merged in `counthouse-api`.

## API client and mock

- Call the API only through `getApiClient()` (`src/server/api/client.ts`), an `openapi-fetch`
  client typed from the schema. Runtime modules in `src/server` import `server-only`.
- `API_MODE=mock|live` is set per deployment, `mock` when unset; live needs `API_BASE_URL`
  (`src/server/env.ts`). There is no fallback from live to mock at runtime.
- In mock mode the client's `fetch` answers from MSW handlers in `src/server/mock`, inside the
  server process; the global `fetch` is not patched. A request with no handler throws. Add a
  handler when a feature first calls an operation. Write it with `createOpenApiHttp<paths>()`
  from `openapi-msw` and answer with `response(status)`, so the status and body are checked
  against the contract at compile time.
- Only `src/server` may import `src/server/mock` (ESLint). Expose anything a page needs from the
  mock, such as the demo accounts, through a function in `src/server`.
- Demo data (`src/server/mock/demo-data.ts`) is public and read-only. Mock tokens are not signed;
  never decode a token in the web app.
- Test handlers through `createApiClient({ mode: "mock" }, { mockLatencyMs: 0 })` with
  `api.use(contractChecks())`, as in `src/server/mock/auth-handlers.test.ts`: every response is
  then checked against `contract/openapi.yaml` (status, content type, schema and formats). Vitest
  maps `server-only` to its empty module.

## Session

- Only `src/server/session.ts` touches the session cookies. Delete them with their full options
  (as `clearSession()` does): `cookies().delete(name)` leaves a `__Host-` cookie in place.
- The data access layer is the gate. Functions that need the user call `requireAccessToken()` or
  `getCurrentUser()` (`src/server/auth.ts`) and pass `authorization(token)` on each API call;
  never attach the token to the shared client. Every Server Action that needs the user reads the
  session itself.
- Signing in over an existing session revokes the old refresh token in `after()`, once the new
  session is written, so the call cannot delay or fail the sign-in.
- A `GET` of `/login` with both cookies redirects to `/products`. The form posts to the same path,
  so other methods pass. `/login/expired` always passes: a token the API refuses lands there with
  both cookies set, so redirecting from it would loop.
- `src/proxy.ts` only redirects from the cookies. Layouts do not re-render on client navigation,
  so never put an access check in a layout.
- Render anything that reads the session behind `Suspense`, as the top bar does.
- Sign-out is a plain form `POST` to `/logout`, a Route Handler that answers 303, so the browser
  loads `/login` as a new document. A Server Action redirect is a client navigation, and Next.js
  keeps the previous screen in the DOM, hidden. The handler repeats the Server Action origin check.
- The sign-in pages are prerendered, so their demo block follows the `API_MODE` of the build.
  Changing the mode needs a new build (on Vercel, a new deployment). Code that acts on the mode at
  request time calls `readApiMode()` there.
- End-to-end tests that need a session use `test.use({ storageState: signedInState })`
  (`e2e/session.ts`); the `setup` project signs in once. A second server of the same build runs
  in live mode with the API unreachable, for failure tests.

## UI library

Shared components come from
[`@nicolassancho/storybook-core`](https://www.npmjs.com/package/@nicolassancho/storybook-core)
([Storybook](https://nicolassancho.github.io/Storybook-core/)). Install it from npm; `npm link` is
only for trying an unreleased change and is never committed. Fix a missing or wrong component in
the library first, release it, then upgrade here. Never copy or fork library code. Only
app-specific layout and screens live in this repo.

- Styles: `src/app/globals.css` imports the library's `theme.css` and points `@source` at its
  `dist` folder, because Tailwind does not scan `node_modules`. Use the token classes
  (`bg-surface`, `text-neutral-900`, `bg-primary text-on-primary`), never hard-coded colors: they
  switch with the theme and the brand.
- The default brand (violet) overrides `--color-primary` and `--color-primary-darker` in
  `globals.css`. Tenants change these two tokens only. Every tenant uses the same font, Inter,
  loaded with `next/font` in the root layout.
- With `typedRoutes` on, Next.js rejects `next/link` passed directly as a library `LinkComponent`:
  its `href` is typed as a known route and the library passes a string. Pass `NavLink`
  (`src/shared/nav-link.tsx`) instead, and keep the hrefs typed as `Route` where they are defined.
