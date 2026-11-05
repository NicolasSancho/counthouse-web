# 0007 Tenant brand read on the server

Status: Accepted

Replaces part of [0006](0006-tenant-theme-injection.md): the `<head>` script, the attribute on
`<html>` and the cookie readable by a script. Presets in the stylesheet and two tokens stay. Adds an
exception to [0002](0002-cache-components.md), which has authenticated UI stream in behind `Suspense`.

Measured in production builds of this app (Next.js 16.4, Cache Components), in Chromium, on a local
server with the mock, and checked by hand on a Vercel preview in Chrome and Firefox.

## Context

The product asks for the tenant's color from the first frame after sign-in. The script of 0006 runs
only on a document load, and sign-in is a client navigation, so the attribute stayed empty until the
next reload.

A cookie read needs no API call, so it does not have the latency that 0006 rejected a blocking layout
for. Where it is read matters:

| Where the cookie is read | Result                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Root layout              | `/login` turns dynamic, and a failed sign-in without JavaScript no longer shows its message |
| `(app)` layout           | The sign-in pages stay static, and the brand is right on every frame after sign-in          |

## Decision

- The `(app)` layout reads the brand cookie and sets `data-brand` on a `display: contents` wrapper
  around the shell. Presets are `[data-brand="..."]` overrides of the two tokens.
- The cookie is `httpOnly`, lasts as long as the refresh token and is deleted with the session. It
  only chooses colors, and a value that is not a known preset counts as none.
- `POST /auth/login` returns tokens only, so sign-in calls `/auth/me` with a 3 second timeout. If that
  fails, sign-in still succeeds, the cookie is deleted and the default brand shows.

## Consequences

- `export const instant = false` on the `(app)` layout is required, and every signed-in route renders
  per request. None has a prerendered shell, now or in later phases. Content behind `Suspense` still
  streams, and `use cache` stays available for data.
- Sign-in makes one more API call, and a hung `/auth/me` delays it by up to the timeout.
- After one failed `/auth/me`, the shell shows the default brand until the next sign-in. The same goes
  for a tenant whose color changes, once tenants can edit it.
- Pages outside the wrapper, such as the sign-in pages and the root error page, show the default
  brand.
- Rejected: forcing a document load after sign-in to keep the script of 0006, which keeps an inline
  script in every page.

## Not verified

- The cost on Vercel of having no prerendered shell, which was not measured.
- Safari and a screen reader.
- The live API.
- Why the root layout read loses the form state: the behavior was measured, its cause inside Next.js
  was not found.
