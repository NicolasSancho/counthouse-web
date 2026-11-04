# 0004 Authentication

Status: Proposed

Implementation: sign-in and sign-out are built (below). The decision not to use an identity provider
is made. Where an expired access token is renewed is an open question (below), so the session part
is proposed until that is tested.

## Context

The back office needs sign-in, roles and tenants. Identity can come from an external identity
provider, or the API can authenticate its own users. The API is expected to authenticate with tokens
(see 0003). Its contract (pinned in `contract/openapi.yaml`, see 0005) defines sign-in, refresh and
sign-out. The access token carries the tenant and the role and lives 15 minutes. The
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

## Implementation: sign-in and sign-out

- The cookies are `__Host-ch_access` and `__Host-ch_refresh`. The access cookie expires 30 seconds
  before the token (`maxAge` = `expiresIn` - 30), the refresh cookie with the refresh token. Only
  `src/server/session.ts` reads or writes them. It deletes them with their full options:
  `cookies().delete(name)` sends the deletion without `secure`, and the browser keeps a `__Host-`
  cookie in that case (seen in a Next.js 16.4.3 production build in Chromium).
- The token is passed explicitly. `requireAccessToken()` reads it once per request (`cache()`),
  and each data access call sends it with `authorization(token)`. The shared API client holds no
  request state, so sign-in, refresh and sign-out never carry a bearer token. Rejected: an
  `openapi-fetch` middleware that reads `cookies()`, which would attach the token to every call
  made through the client.
- `src/proxy.ts` redirects from the cookies alone: no refresh cookie to `/login`, a refresh cookie
  without an access cookie to `/login/expired`, and a `GET` of `/login` with both cookies to
  `/products`. It always lets `/login/expired` through, so a refused token cannot loop. Server Action requests are redirected like any other: the browser replays the
  action's `POST` on the sign-in page, and each action that needs the user reads the session
  itself.
- The data access layer is the gate (`src/server/auth.ts`). The signed-in layout only shows the
  user: layouts do not re-render on client navigation, so a check there would not run again.
  `getCurrentUser()` redirects a 401 from `/auth/me` to `/login/expired` while the page streams
  (on a page load, as a meta refresh in the streamed HTML). Other failures reach a `catchError`
  boundary around the top-bar user, so the page stays usable.
- Sign-out is a plain form `POST` to the Route Handler `/logout`, which revokes the refresh token,
  deletes the cookies and answers 303 to `/login`. A Server Action redirect is a client navigation,
  and Next.js keeps the previous screen in the DOM, hidden (`display: none`), so the signed-out
  user's data stayed in the page. A Route Handler does not get the Server Action origin check, so
  it repeats it: an `Origin` that does not match `X-Forwarded-Host` or `Host` gets 403.
- The expired notice is its own route, `/login/expired`, not a query parameter. Reading
  `searchParams` needs a `Suspense` boundary, and with one on the page a sign-in posted without
  JavaScript came back blank. Both sign-in routes are fully static.
- Session reads are cached per request with React `cache()` only. `use cache: private` (see 0002)
  is not used yet: it needs a measured navigation and a test that switching accounts never shows
  the previous user.
- The demo block on the sign-in page follows the `API_MODE` of the build, because the page is
  prerendered. The demo action checks the mode again at request time.

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

- A screen reader on the sign-in errors. Focus moves to a wrapper around the alert, as in the
  GOV.UK error summary; the tests check focus and the `alert` role, not what is announced.
- That the user error boundary lets a `redirect()` through on the client. It holds by source
  (`catchError` rethrows Next.js router errors), but no test reaches it: on a page load the server
  sends the redirect itself.
- Safari with `secure` cookies on `http://localhost`.
- Sign-in against the real API.
- Where the refresh runs, and how it behaves with parallel requests.
- Tests planned for this record: an end-to-end test for expiry and refresh, and one showing that an
  Operator is refused an admin action by the server and not only by the UI.
