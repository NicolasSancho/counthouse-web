# 0010 Script policy with a nonce

Status: Accepted

Extends [0002](0002-cache-components.md): every page now renders per request. Changes part of
[0009](0009-signed-in-pages-need-javascript.md): a failed sign-in without JavaScript no longer shows
its message.

Measured in production builds of this app (Next.js 16.4, Cache Components), in Chromium, on a local
server with the mock.

## Context

The security policy sent `frame-ancestors`, `object-src` and `base-uri`, and no `script-src`, so any
script that reached a page would run. In a back office such a script acts as the signed-in user on
the tenant's data. The app renders no raw HTML today. The policy is a second layer for the day a
change does.

Next.js renders inline scripts in every page, to hydrate it and to stream content, so a plain
`script-src 'self'` stops the app.

| Option                                           | Result                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| No `script-src`                                  | Pages can be built ahead of time. An injected script runs                                                          |
| `script-src 'self' 'unsafe-inline'`              | Pages can be built ahead of time. An injected inline script still runs, so it stops little                         |
| `script-src 'self'` with Next's experimental SRI | Bundled scripts get hashes, but the inline ones do not, and the page does not hydrate                              |
| A nonce per request, with `'strict-dynamic'`     | Every script Next renders carries the nonce. An injected script does not run. Every page has to render per request |

Next.js puts the nonce on its scripts while rendering, so a page built ahead of time has none. With
the nonce, `/`, `/login`, `/login/expired` and the not-found page stop being built ahead of time.
The signed-in pages already render per request, because of the brand cookie
([0007](0007-tenant-brand-read-on-the-server.md)): a client navigation from the list to a product
took 869 ms without the nonce and 875 ms with it (median of 15, with 100 ms added to each request).

## Decision

- Pages get `script-src 'self' 'nonce-…' 'strict-dynamic'` with the three directives above. The
  proxy makes the nonce on every request. Scripts that Next renders with the nonce may load others.
- Every page renders per request.
- Paths the proxy skips, such as build assets, keep the three directives.
- Styles, images and connections are not restricted by this decision.
- Working without JavaScript is not a goal. Forms still work before the page hydrates where that
  costs nothing: sign-in, the demo and sign out.

## Consequences

- An injected `<script>` or inline event handler does not run, and the browser reports it.
- A script that the app adds must take the nonce from the request, or the browser refuses it.
- A failed sign-in without JavaScript, or before the page hydrates, brings back the empty form,
  without its message or the email.
- The sign-in pages are no longer served from a cache, and they follow the `API_MODE` of the server
  instead of the build.

## Not verified

- Deployment on Vercel.
- Browsers other than Chromium.
