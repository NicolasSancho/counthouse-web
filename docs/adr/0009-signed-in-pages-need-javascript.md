# 0009 Signed-in pages need JavaScript

Status: Accepted

Records a consequence of [0002](0002-cache-components.md), which has authenticated UI stream in
behind `Suspense`. The sign-in pages are not affected.

Measured in production builds of this app (Next.js 16.4, React 19.3, Cache Components), in Chromium
with JavaScript turned off, on a local server with the mock.

## Context

React streams the content of a `Suspense` boundary after its fallback, inside `<div hidden>`, and an
inline script moves it into place. Without JavaScript that script does not run, so the page keeps
its fallback. The products list showed "Loading products" and the user menu showed "Account",
although both were in the HTML. A Server Action posted without JavaScript answers with the same
streamed page, so its result stays hidden too.

| Option                                      | Result                                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Pages that wait for their data, no fallback | Work without JavaScript, including a plain form post. They lose the skeleton and the instant navigation of 0002, and differ from the list |
| Keep streaming, require JavaScript          | Every signed-in page streams as today. Without JavaScript a notice says so                                                                |

## Decision

- Signed-in pages keep streaming behind `Suspense` and need JavaScript.
- The `(app)` layout renders a `<noscript>` notice that says so.
- The sign-in pages and Sign out keep working without JavaScript.

## Consequences

- A visitor without JavaScript sees the shell, the notice and loading states, and can sign out.
- Forms on signed-in pages can rely on JavaScript, for example `useActionState` for their results.
- Rejected: pages that wait for their data, for the reasons in the table. Making only some pages
  wait was rejected too: a visitor without JavaScript would still reach pages that stay on their
  loading state, starting with the user menu.

## Not verified

- Browsers other than Chromium.
- A screen reader with JavaScript turned off.
- A form posted before the page hydrates.
