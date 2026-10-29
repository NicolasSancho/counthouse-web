# 0003 Backend for frontend

Status: Accepted

Implementation: not started. This record describes the decision, and the code does not follow it yet.

## Context

The web app talks to a separate API that authenticates with tokens. A token held in the browser
can be read by any script that runs on the page. Server Components can read cookies but cannot set
them, so refreshing an expired token needs a place that can.

## Decision

- The Next.js server is the only client of the API. The browser never receives an API token.
- Tokens are stored in `httpOnly` cookies set by the server.
- Calls to the API are made from `src/server`, using types generated from the pinned OpenAPI
  contract.
- An expired access token is refreshed in `proxy.ts`, which can set cookies, before the request
  reaches a Server Component.

## Consequences

- A cross-site script cannot steal the tokens, and the API needs no CORS configuration for the
  browser.
- Every call to the API passes through the Next.js server, which adds a hop and means the web app
  must be running for the API to be used.
- Session handling is the web app's responsibility, so the data access layer must check the
  session on each read and write (see 0001).
- Rejected: calling the API from the browser with tokens in `localStorage`, which exposes the
  tokens to script injection.
