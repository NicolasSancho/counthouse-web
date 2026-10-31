# 0005 Contract pin and mock server

Status: Accepted

Implementation: not started. The contract has not been added to `counthouse-api` yet, so there is
nothing to pin today, and the mechanisms under "Not verified" are planned and untested.

## Context

The OpenAPI contract belongs to `counthouse-api` and changes there by pull request, before any code
that depends on it. It has not been added there yet. The web app has to be built, tested and
demonstrated without waiting for a running API.

## Decision

- Once the contract is in `counthouse-api`, this repo keeps a pinned copy of it and generates types
  from it with `openapi-typescript`, using `--default-non-nullable false`. Without that flag a
  schema `default` makes the field required in the generated request type, which a type test
  against the draft contract showed for fields such as an optional description.
- The API is called with `openapi-fetch`, from `src/server` only (see 0001 and 0003).
- In mock mode the app answers its own API calls from an in-process mock server built from the same
  contract. It runs in Node, because the calls are made by the Next.js server, and its data is typed
  from the generated schema.
- `API_MODE=mock|live` is set per deployment. There is no fallback from the live API to the mock at
  runtime.
- The mock is the public demo and is labelled as simulated. The live API is a second deployment
  that a visitor can choose once the API is ready.

## Consequences

- The web app does not wait for the API, and a contract change breaks the types at compile time
  instead of in production.
- The mock can drift from the real API and hide hard cases. The planned mitigations are handlers
  typed from the generated schema, a CI check that regenerating the types produces no diff, and mock
  responses that simulate latency, validation errors, unauthorized requests, version conflicts and
  long paginated lists.
- Rejected: writing the backend first, and hand-written API types.

## Not verified

- Starting the mock server from `instrumentation.ts`, and typing its handlers from the schema.
- State kept in memory on serverless hosting, where instances are short-lived and may be several.
  "Create a product, then see it in the list" has to be tested before anything depends on it.
- The pinned copy and the generated types themselves: they wait for the contract to be added to
  `counthouse-api`.
- The CI check for generated types.
