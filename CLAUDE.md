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

- Only `src/server/session.ts` defines the session cookies; the proxy sets what it exports. Delete
  them with their full options (as `clearSession()` does): `cookies().delete(name)` leaves a
  `__Host-` cookie in place.
- The access cookie starts with a fingerprint of the refresh token, and one that does not match
  counts as missing (`unwrapAccessToken()`). End-to-end tests that set it by hand use `boundAccess()`
  from `e2e/session.ts`, or the proxy replaces it before anything reads it.
- The data access layer is the gate. Functions that need the user call `requireAccessToken()` or
  `getCurrentUser()` (`src/server/auth.ts`) and pass `authorization(token)` on each API call;
  never attach the token to the shared client: an `openapi-fetch` middleware that reads `cookies()`
  was rejected, because it would attach the token to every call made through the client. Every
  Server Action that needs the user reads the session itself.
- Session reads are cached per request with React `cache()` only. `use cache: private` (ADR 0002) is
  not used yet: it needs a measured navigation and a test that switching accounts never shows the
  previous user.
- Signing in over an existing session revokes the old refresh token in `after()`, once the new
  session is written, so the call cannot delay or fail the sign-in.
- A `GET` of `/login` with a refresh cookie redirects to `/products`, which handles every state of
  the session. The form posts to the same path, so other methods pass. `/login/expired` always
  passes: a token the API refuses lands there with both cookies set, so redirecting from it would
  loop.
- `src/proxy.ts` redirects from the cookies and renews an expired access token
  (`src/server/refresh.ts`). A refresh the API refuses ends the session. Any other failure keeps the
  refresh cookie, and `requireAccessToken()` throws, so the page shows the usual API failure.
- The proxy redirects only `GET` and `HEAD`: a redirected Server Action `POST` fails on the page it
  is replayed on. It passes, and the action's own session read redirects.
- Layouts do not re-render on client navigation, so never put an access check in a layout.
- Render anything that reads the session behind `Suspense`, as the user menu does. The brand cookie
  in the `(app)` layout is the one exception (see "Brand"). `UserSlot`
  (`src/shared/user-slot.tsx`) adds a boundary with a quiet fallback, for the trigger name and the
  tenant tile.
- Sign out lives in the user menu, outside the boundaries that read the user, so it works while
  the user loads, when loading fails and without JavaScript. Retry reloads the document: one
  failed `/auth/me` shows in several boundaries, and `retry()` resets only its own.
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

## Products list

- The list's state lives in the URL: `q`, `status`, `sort` and a 1-based `page`. `parseProductQuery()`
  reads it, and a value the API would refuse falls back to its default. `productsHref()` writes it.
- `ProductListProvider` owns that state. Every change goes through it, in a transition, and builds
  on any change still loading, so the current rows stay on screen, dimmed, until the new ones arrive.
  The `Suspense` around the results has no key: a key shows the skeleton on every change and drops
  focus to `<body>`.
- Links in the list use `ProductLink`, which applies only what its `href` changes. Product names are
  the exception: they leave the list, so they use `NavLink`.
- `applyChange()` holds the rules for merging a change into the list. Random sequences of changes
  test it (`product-list-changes.test.ts`). `e2e/products-overlaps.spec.ts` runs every pair of user
  actions against the real page, with both made before any answer arrives. Add a new action to both.
- A link that vanishes with a change, such as Next on the last page, would leave focus on `<body>`, so
  `ProductResultsPane` takes focus then.
- Reads go through `readApi()` (`src/server/api/read.ts`), which returns an `ApiRead`: the value,
  not found, or failed with the trace id. An error thrown in a Server Component loses its details in
  production, trace id included. A 401 ends the session. Unexpected errors reach
  `src/app/(app)/error.tsx`, which keeps the shell. `LoadFailedAlert` shows a failed read.
- `listProducts()` calls `connection()` before the API. Without it, a runtime prefetch ends with the
  call still open, Next.js rejects it, and the failure handling logs an API failure that did not
  happen. Only a live API shows this: the mock's `fetch` is not patched. No test covers it.
- Reads are not cached ([ADR 0008](docs/adr/0008-product-reads-not-cached.md)).

## Product detail

- `/products/[id]` streams behind `Suspense` like the list. `getProduct()` takes the URL segment:
  `normalizeProductId()` decodes and lowercases it, and a segment that is not a UUID is not found
  without an API call (the contract has no 400 there). The read is wrapped in `cache()`, so the page
  and `generateMetadata` share one call.
- A missing product, or another tenant's, renders `products/[id]/not-found.tsx` inside the shell.
  The shell has already streamed, so the answer is HTTP 200 with `noindex`; `readApi()` logs the 404.
- Product links carry the list state (`productHref()`), and the page reads it with
  `parseProductQuery()`, so the way back returns to the list as it was left. `not-found.tsx` gets no
  props, so `ListReturnLink` reads the URL itself.
- The side column (Status, Details) comes first in the code, so on narrow screens it shows before
  the variants table. Long names and descriptions wrap anywhere, so they never widen the page.
- Variants show one column per option name, active ones first. An active variant with no stock
  reads "Out of stock".
- After a client navigation to another page, `RouteFocus` in the shell moves focus to `main` when it
  was left on `<body>`, so the next Tab reaches the page's first control.
- The demo catalog (`src/server/mock/demo-products.ts`) stores product details only, and the list's
  summary is derived with `toSummary()`, as the API derives it. Acme's products are written out by
  hand, one case each, and Northwind's cases are set by name; tests refer to them by name.
  `demo-products.test.ts` checks the contract's prose rules.

## Formats

- Prices and dates follow the reader's region; the currency is always the tenant's. `getFormatLocales()`
  (`src/server/locale.ts`) reads `Accept-Language` once per request, and `formatLocales()`
  (`src/shared/locale.ts`) turns it into two locales: the reader's for prices, English with the
  reader's region for dates (`en-DE`), so no month name in another language reaches an English page.
- Any locale with Latin digits that reads left to right is accepted; anything else, or no header,
  gives en-GB. A property test checks that no header yields other digits or direction marks.
- Call `getFormatLocales()` inside a `Suspense` boundary, after the data, and pass the locale to the
  formatters in `src/features/products/format.ts`. Format on the server only, so hydration never sees
  a second locale. Times stay in UTC and say so; counts stay plain integers.
- Playwright pins `locale: "en-GB"`; `e2e/locale.spec.ts` sets other readers. `Intl` separates an
  amount from its symbol with a no-break space (`\u00a0`), so expectations spell it out.

## JavaScript

Signed-in pages need JavaScript ([ADR 0009](docs/adr/0009-signed-in-pages-need-javascript.md)):
streamed content stays hidden without it, and `NoScriptNotice` in the `(app)` layout says so. The
sign-in pages and Sign out work without it. Playwright's text matchers skip `<noscript>` content, so
tests read `innerText()`.

## Brand

- The `(app)` layout reads the brand cookie with `readBrand()` (`src/server/brand.ts`) and sets
  `data-brand` on the wrapper around the shell, so every signed-in route renders per request
  ([ADR 0007](docs/adr/0007-tenant-brand-read-on-the-server.md)). Keep this read out of the root
  layout: there it makes the sign-in pages dynamic and breaks a failed sign-in without JavaScript.
- A preset needs both a row in `PRESETS` and a `[data-brand]` rule in `src/app/globals.css`. Check its
  contrast in both themes and state it in the CSS comment.
- The brand cookie is one of `SESSION_COOKIES`, so everything that ends a session deletes it. Sign-in
  sets it from `/auth/me`, and deleting it uses the full options like the others.
