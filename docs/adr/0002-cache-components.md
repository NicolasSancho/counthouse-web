# 0002 Cache Components

Status: Accepted

## Context

Almost every screen of a back office depends on the signed-in user, so reads happen at request
time. Next.js 16 offers Cache Components, where request-time reads must sit behind a `Suspense`
boundary and caching is opt-in with `use cache`. The alternative is the previous model, where
routes are static or dynamic as a whole.

## Decision

`cacheComponents` is enabled in `next.config.ts`, together with `partialPrefetching` and
`typedRoutes`.

Authenticated UI streams in behind `Suspense`. Data derived from the session is cached with
`use cache: private` or with a plain `use cache` keyed by a value such as the user id, as the
Next.js guide for authentication with Cache Components describes. Content is cached only where `use cache` is used.

## Consequences

- Every route that reads cookies or headers has to handle the request-time part explicitly, so the
  cost of dynamic data is visible in the code.
- Enabling it later would change how each existing route reads request data, so it is turned on
  from the first commit.
- The skeleton has no cached content yet. The first record that adds a `use cache` call should
  state what it caches and for how long.
- Rejected: leaving it off. The route model would stay whole-route static or dynamic, and moving to
  Cache Components later would mean revisiting every route.
