# 0001 Code structure and enforced boundaries

Status: Accepted

## Context

The app is built by adding areas of the product (for example products and orders) on top of one
API. Without rules, imports between areas grow into cycles, server-only code ends up in Client
Components and every change touches many folders. Next.js does not prescribe a layout.

## Decision

- `src/app` holds routes only. `src/features/<feature>` holds everything for one area.
  `src/server` holds server-only code: the API client, sessions, the data access layer and
  environment parsing. `src/shared` holds UI and pure helpers that several features use.
- Dependencies point one way: `app` to `features` to `shared` and `server`. A feature does not
  import another feature, and `shared` imports nothing from the other folders. Behavior two
  features need is composed in `src/app` or moved to `src/shared` or `src/server`.
- `eslint-plugin-boundaries` enforces these rules, type-only imports included. A second rule
  allows `process.env` in `src/server` only.
- Authorization is checked in the data access layer, next to the data. The proxy only redirects.
  The Next.js documentation recommends a data access layer for new projects and describes the
  proxy as an optimistic check, not an authorization solution.

## Consequences

- A boundary violation fails lint in CI, so the structure does not depend on review.
- Moving code to `src/shared` when a second feature needs it is a visible, deliberate step.
- A feature that embeds another feature's UI has to go through `src/shared` or a page that
  composes both. This costs some indirection.
- Rejected: layers by technical role (`services/`, `repositories/`), which adds ceremony for an
  app of this size; a shared `lib` or `utils` folder, which collects unrelated code; barrel files,
  which hide dependencies; and `no-restricted-imports` alone, which needs a config block for each
  feature, so adding a feature would mean editing the lint config.
- The plugin is an extra dev dependency, and its configuration format changed between major
  versions.
