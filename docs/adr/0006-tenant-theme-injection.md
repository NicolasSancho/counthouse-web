# 0006 Tenant theme injection

Status: Accepted

Implementation: not started. The approach was measured in a scratch copy of the app (Next.js 16.4,
Cache Components, a production build) and is not built here yet.

## Context

Each tenant has a brand color, and the UI library themes itself through two tokens,
`--color-primary` and `--color-primary-darker`. The tenant is known only after the API answers, and
with Cache Components the root layout must not read request data outside a `Suspense` boundary. The
page must show the tenant's color from the first paint, without a flash of the default brand.

Five ways were tried, each with 400 ms of simulated latency standing in for the tenant request:

| Approach                                                         | Result                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Read the cookie in a layout, no `Suspense`                       | The build fails: request data is read outside `Suspense`                                   |
| `Suspense` around the content and the style                      | A fallback first, then the tenant's color, so no content shows until the tenant is known   |
| `Suspense` around the style only                                 | The content shows in the library's default color for the whole latency, then switches      |
| A blocking layout (`instant = false`)                            | A blank page for the latency, and no static shell                                          |
| Preset CSS in the stylesheet and a script that sets an attribute | The tenant's color at the first frame, the route stays static, and latency does not matter |

## Decision

- Tenant presets are in the stylesheet, as `:root[data-brand="..."]` overrides of the two tokens,
  with a value for each theme.
- A small script in `<head>` copies a `brand` cookie to `<html data-brand>` before the first paint.
  The login action sets the cookie. `<html>` has `suppressHydrationWarning`, because the attribute
  is set before React hydrates and the development build otherwise reports a mismatch.
- The cookie is not sensitive and not authoritative. It only chooses colors, and a missing or
  unknown value falls back to the default theme.

## Consequences

- Only presets known at build time work this way. The API stores a free color, so the web app has to
  map a known color to a preset.
- A free color picker cannot use this approach. Its colors are not known at build time, so it needs
  a runtime style behind `Suspense` or a blocking layout, and a change in the UI library so the
  override is two plain variables.
- Turbopack rewrites every `light-dark()` in CSS files. Presets stay in the stylesheet, which goes
  through the same pipeline. A runtime style with native `light-dark()` works only in browsers that
  support the function.
- Rejected: a `<style>` injected from the root layout (the flash, or a build error) and a client
  theme provider (a flash).

## Not verified

- Deployment on Vercel, other browsers than Chromium, and a screen reader.
- The real latency of the tenant request. The 400 ms was invented.
- How a color from the API maps to a preset. This is decided when it is built.
