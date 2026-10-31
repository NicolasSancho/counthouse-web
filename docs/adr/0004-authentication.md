# 0004 Authentication

Status: Proposed

Implementation: not started. The decision not to use an identity provider is made. Where an expired
access token is renewed is an open question (below), so the session part is proposed until that is
tested.

## Context

The back office needs sign-in, roles and tenants. Identity can come from an external identity
provider, or the API can authenticate its own users. The API is expected to authenticate with tokens
(see 0003). Its planned contract, which has not been added to `counthouse-api` yet, defines sign-in,
refresh and sign-out. The access token carries the tenant and the role and lives 15 minutes. The
refresh token is opaque, is stored hashed by the API, lives 7 days and is not rotated. The web app
has to keep both between requests without exposing them to scripts, and renew the access token
without signing the user out.

## Decision

No identity provider (decided):

- The API authenticates its users and issues its own tokens. The web app does not integrate an
  external identity provider. An email address is unique across all tenants, so signing in needs no
  tenant.
- An identity provider is another service to configure and keep running for an app of this size. It
  is also awkward in mock mode (see 0005), where the demo has to answer sign-in itself without a
  running service.

Sessions and refresh tokens (proposed):

- Both tokens are kept in `httpOnly`, `secure` cookies set by the server, with `SameSite=Lax`.
- The data access layer checks the session on every read and write (see 0001). The proxy only does
  an optimistic check from the cookie.
- State changes go through Server Actions. Next.js allows them only with `POST` and compares the
  `Origin` header with the `Host` header, which together with `SameSite=Lax` is the CSRF position.
- Sign-out calls the API, which revokes the refresh token.
- The refresh token is not rotated. Several requests can arrive with the same expired access token,
  for example when routes are prefetched, and each one would try to refresh. An in-process lock does
  not span serverless instances. Rotation with reuse detection would treat the second refresh as a
  theft and sign the user out.

## Open question

0003 says the proxy renews an expired access token, and 0001 says the proxy only redirects. The
Next.js 16.4 documentation says the proxy "is not intended for slow data fetching" and advises
reading only the session cookie there. A refresh is a network call to the API. It happens only when
the access token has expired, but the proxy also runs on prefetched routes.

The alternative is a Route Handler, which can set cookies, that renews the token and redirects
back, with the proxy limited to the cookie check. This is decided with an end-to-end test for
expiry and for parallel requests before it is built. The session part of this record is then
accepted or superseded.

## Consequences

- The API owns credential handling. Passwords are hashed by the API.
- There is no single sign-on and no multi-factor sign-in.
- The mock server has to implement sign-in for the demo accounts.
- A cross-site script cannot read the tokens.
- The role in the access token can be out of date for up to 15 minutes after it changes.
- A stolen refresh token stays valid until it expires or the user signs out. It exists only in an
  `httpOnly` cookie handled by the Next.js server.
- Rejected: rotating refresh tokens with reuse detection, for the reason above.

## Not verified

- Where the refresh runs, and how it behaves with parallel requests.
- Tests planned for this record: an end-to-end test for expiry and refresh, and one showing that an
  Operator is refused an admin action by the server and not only by the UI.
