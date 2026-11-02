# 0005 Contract pin and mock server

Status: Accepted

Implementation: the pinned copy, the generated types and their CI checks are in place (contract
0.3.0, see [`contract/README.md`](../../contract/README.md)). The typed client and the mock for the
four auth operations (login, refresh, logout, `GET /auth/me`) are in `src/server`. The product
operations have no mock yet, and nothing calls the client yet.

## Context

The OpenAPI contract belongs to `counthouse-api` and changes there by pull request, before any code
that depends on it. When this decision was taken it had not been added there yet. The web app has
to be built, tested and demonstrated without waiting for a running API.

## Decision

- Once the contract is in `counthouse-api`, this repo keeps a pinned copy of it and generates types
  from it with `openapi-typescript`, using `--default-non-nullable false`. Without that flag a
  schema `default` makes the field required in the generated request type, which a type test
  against the draft contract showed for fields such as an optional description.
- The API is called with `openapi-fetch`, from `src/server` only (see 0001 and 0003). Its runtime
  modules import `server-only`.
- `API_MODE=mock|live` is set per deployment, `mock` when unset. Live mode needs `API_BASE_URL`,
  and `API_BASE_URL` without live mode is an error, so a deployment meant for the API cannot quietly
  serve the demo. The values are checked on the first API call, not at boot. There is no fallback
  from the live API to the mock at runtime.
- In mock mode the client gets a `fetch` that passes each request to MSW request handlers with
  `getResponse`, inside the Next.js server process. The global `fetch` is not patched, and a
  request no handler matches throws instead of reaching the network. The mock host is
  `api.mock.invalid`, which cannot resolve. The mock adds 150 ms of latency, so loading states show
  in the demo; tests use 0.
- Handlers are written with `openapi-msw`, which types each path, request body and response from
  the generated `paths`: `response(status)` accepts only the statuses the contract lists for the
  operation, each with its own body. A wrong status, a missing field, a body on a 204 or an unknown
  path fails `typecheck`.
- In tests, an `openapi-fetch` middleware checks every response against `contract/openapi.yaml`
  with Ajv: declared status, declared content type, the body's JSON Schema with formats, and a
  Problem Details `status` equal to the HTTP status. Types cannot check formats, patterns or
  content types.
- Only `src/server` may import `src/server/mock`; ESLint rejects imports of it from routes, features
  and shared code.
- Mock tokens are unsigned base64url JSON with a subject, a kind and an expiry. The mock checks
  expiry and kind, not authenticity, and every demo account is public. The web app never decodes
  tokens. Mock sign-out revokes nothing.
- The mock is the public demo and is labelled as simulated. The live API is a second deployment
  that a visitor can choose once the API is ready.

Measured when the mock was built (Next.js 16.4.3 production build, a route that called the client):
the browser chunks contain no match for MSW, the mock host or the demo emails; the MSW import took
about 60 ms in plain Node.

Rejected:

- Starting MSW's `setupServer` from `instrumentation.ts`: it patches the global `fetch` for the
  whole server.
- Mocking the data access layer: it skips the HTTP layer the live API uses.
- A hand-written router: close to MSW; the option to switch to if MSW's cold start or upgrades cost
  too much.
- Prism: it answers from the examples, with no logic or state.
- Next.js Route Handlers as the mock: an extra function call per request, and public routes.

## Consequences

- The web app does not wait for the API, and a contract change breaks the types at compile time
  instead of in production.
- The mock can still drift from the real API in behavior the contract does not describe, and it can
  hide hard cases. The mitigations are handlers typed per status, the response checks in tests, a CI
  check that regenerating the types produces no diff, and mock responses that simulate latency,
  validation errors and unauthorized requests.
- Request validation in the handlers is written by hand. It follows the contract's rules but is not
  generated from them.
- MSW, `openapi-msw` and `openapi-fetch` are runtime dependencies, because the demo runs the mock in
  production. A live deployment also loads them, since the client imports the mock statically.
- Rejected: writing the backend first, and hand-written API types.

## Contract gaps

Candidates for contract 0.3.1, where the mock had to choose:

- An unknown body field gets 400 `VALIDATION_FAILED`, but no `FieldErrorCode` fits it, so the mock
  sends no `errors` entry.
- The contract does not say whether emails are compared without regard to case. The mock matches
  them exactly.
- An empty password is answered with `REQUIRED`, although the schema's `minLength: 1` could also
  mean `TOO_SHORT`, and a password of spaces only is accepted as present.

## Not verified

- MSW's cold start on Vercel.
- Mock responses are checked against the contract in tests only, for the requests the tests make;
  nothing checks them at runtime.
- State kept in memory on serverless hosting, where instances are short-lived and may be several.
  "Create a product, then see it in the list" has to be tested before anything depends on it.
