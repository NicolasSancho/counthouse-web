# 0004 Authentication

Status: Accepted

## Context

The back office needs sign-in, roles and tenants. Identity can come from an external identity
provider, or the API can authenticate its own users. The API is expected to authenticate with tokens
(see 0003). Its contract (pinned in `contract/openapi.yaml`, see 0005) defines sign-in, refresh and
sign-out. The access token carries the tenant and the role and lives 15 minutes. The
refresh token is opaque, is stored hashed by the API, lives 7 days and is not rotated. The web app
has to keep both between requests without exposing them to scripts, and renew the access token
without signing the user out.

## Decision

No identity provider:

- The API authenticates its users and issues its own tokens. The web app does not integrate an
  external identity provider. An email address is unique across all tenants, so signing in needs no
  tenant.
- An identity provider is another service to configure and keep running for an app of this size. It
  is also awkward in mock mode (see 0005), where the demo has to answer sign-in itself without a
  running service.

Sessions and refresh tokens:

- Both tokens are kept in `httpOnly`, `secure` cookies set by the server, with `SameSite=Lax`.
- The data access layer checks the session on every read and write (see 0001). The proxy redirects
  from the cookies as an optimistic check, and renews the access token.
- State changes go through Server Actions. Next.js allows them only with `POST` and compares the
  `Origin` header with the `Host` header, which together with `SameSite=Lax` is the CSRF position.
- Sign-out calls the API, which revokes the refresh token. Signing in over an existing session
  revokes the refresh token it replaces.
- The refresh token is not rotated. Several requests can arrive with the same expired access token,
  for example when routes are prefetched, and each one would try to refresh. An in-process lock does
  not span serverless instances. Rotation with reuse detection would treat the second refresh as a
  theft and sign the user out.

Renewing the access token:

- The proxy renews it, on any method, when the access cookie is missing and the refresh cookie
  exists. It is the one place that runs before a Server Component and can set cookies. The Next.js
  16.4 documentation says the proxy "is _not_ intended for slow data fetching" and "should not be
  used as a full session management or authorization solution". The call happens about every 15
  minutes per session, once for each request in flight at that moment, with a 3 second timeout.
  The proxy only renews the token: the data access layer stays the gate.
- The new token goes on the response and on the forwarded request, so the same render reads it.
- A refresh the API refuses (400 or 401) ends the session: the cookies are deleted and the user is
  told it expired. Any other failure says nothing about the token, so the refresh cookie stays and
  the page shows what an API failure shows, with a retry.
- The access cookie is bound to the refresh token by a fingerprint of it, and a cookie that does not
  match counts as missing. A refresh in flight when another tab signs in or out writes its cookie
  afterwards. Without the binding, a sign-in would then read the previous user's tenant until the
  cookie expired, and a sign-out would still read as signed in.
- The proxy redirects only `GET` and `HEAD`. A redirected Server Action `POST` is replayed on the
  sign-in page, where the action does not exist, so it passes and the action redirects when it
  reads the session.
- Rejected: a Route Handler that renews the token and redirects back. A Server Action `POST` does
  not survive that redirect, and each expiry would cost two more hops.

## Consequences

- The API owns credential handling. Passwords are hashed by the API.
- There is no single sign-on and no multi-factor sign-in.
- The mock server has to implement sign-in for the demo accounts.
- A cross-site script cannot read the tokens.
- The role in the access token can be out of date for up to 15 minutes after it changes.
- A stolen refresh token stays valid until it expires, or until the browser it came from signs out
  or signs in again. It exists only in an `httpOnly` cookie handled by the Next.js server.
- A refresh refused late, after another tab signed in, clears the new session too. It fails safe.
- During an API outage every request of a page tries to refresh, and waits up to the timeout.
- Rejected: rotating refresh tokens with reuse detection, for the reason above.

## Not verified

- A screen reader on the sign-in errors. Focus moves to a wrapper around the alert, as in the
  GOV.UK error summary; the tests check focus and the `alert` role, not what is announced.
- That the user error boundary lets a `redirect()` through on the client. It holds by source
  (`catchError` rethrows Next.js router errors), but no test reaches it: on a page load the server
  sends the redirect itself.
- Safari with `secure` cookies on `http://localhost`.
- Sign-in against the real API.
- On Vercel, whether the forwarded header or the internal cookie merge carries the new token to the
  render. A preview deployment did renew the token after the access cookie was deleted.
- The refresh in Safari. On a preview deployment it passed in Firefox, including sign-out.
- That `after()` runs on Vercel. The Next.js documentation says it uses `waitUntil`, but the mock
  revokes nothing, so a run would show nothing.
- A signed-in Server Action after expiry, in the app: none exists yet. It was tested on a throwaway
  page.
- Planned for this record: a test showing that an Operator is refused an admin action by the server
  and not only by the UI.
