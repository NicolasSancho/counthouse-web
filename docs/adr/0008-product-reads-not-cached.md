# 0008 Product list reads are not cached

Status: Accepted

[0002](0002-cache-components.md) enabled Cache Components and asked the first record about caching to
state what is cached. This is that record: for the products list, nothing is.

Read in the Next.js 16.4 documentation shipped in `node_modules/next/dist/docs/`, and measured in a
production build of this app on a local server, in Chromium.

## Context

The products list is the first screen with data. Each API call needs the user's bearer token, and the
list shows stock, which a back office user acts on.

| Option                 | Result                                                                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain `use cache`      | It cannot read cookies, and the token cannot be passed in: arguments become the cache key in plain text, and the guide says to keep tokens out of them.                                                                             |
| `use cache: private`   | It can read the cookies, but it keeps the result in the browser only, and it helps navigation only with a `stale` time of at least 30 seconds for per-link prefetching and 5 minutes for the App Shell, which is too long for stock |
| A tenant service token | It would allow a shared cache per tenant. The contract has no such token                                                                                                                                                            |

With `cacheComponents` and `partialPrefetching` turned off, this app built the same route table and
all its tests passed. Today the flags earn little on signed-in routes, which render per request
([0007](0007-tenant-brand-read-on-the-server.md)). The documentation says both will be enabled
everywhere in the next major release, and the options removed.

## Decision

The list is read from the API on every request. Each change of filters, sort or page makes one call to `/products`.

Cache Components stays on, for the reason above and not for a measured gain.

## Consequences

- Each new list state shows current stock, at the cost of an API call. Back and Forward can restore
  rows from the client router, which may be older.
- Moving between list states shows the current rows, dimmed, until the new ones arrive. The call to
  `/products` is not prefetched.
- Revisit this if the API offers a way to read a tenant's catalog without a user's token, or if a
  measured navigation shows the call is too slow.

## Not verified

- The latency of these reads against the real API, which does not serve `/products` yet.
