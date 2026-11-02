# counthouse-web

Web app for Counthouse, a back office, built with Next.js.

## Stack

Next.js 16 (App Router, Cache Components, typed routes), React 19, TypeScript (strict), Tailwind
CSS v4. Components and design tokens come from
[`@nicolassancho/storybook-core`](https://www.npmjs.com/package/@nicolassancho/storybook-core); the
font is Inter, self-hosted with `next/font`. Tests: Vitest, and Playwright with axe for
accessibility. CI runs on GitHub Actions.

## Getting started

Requires the Node version in `.nvmrc` (24).

```bash
npm ci
npm run dev
```

The app runs at http://localhost:3000.

### Environment variables

| Variable       | Purpose                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| `API_MODE`     | `mock` (default) answers API calls inside the app; `live` uses the API             |
| `API_BASE_URL` | Base URL of the API, such as `http://localhost:8080/api/v1`; required in live mode |

### How the mock works

In mock mode the server's API client sends each request to MSW request handlers in the same
process instead of the network, so the app runs without the API. The handlers are typed per
status from the pinned contract, the tests check their responses against it, and they serve
public demo accounts with simulated data. Only the
auth operations are mocked so far; see [ADR 0005](docs/adr/0005-contract-pin-and-mock-server.md).

## Scripts

| Command                  | Purpose                                               |
| ------------------------ | ----------------------------------------------------- |
| `npm run dev`            | Development server                                    |
| `npm run build`          | Production build                                      |
| `npm run typecheck`      | Generate route types, check TypeScript and type tests |
| `npm run lint`           | ESLint, with type-checked rules                       |
| `npm run format:check`   | Prettier check (`npm run format` fixes)               |
| `npm test`               | Vitest                                                |
| `npm run test:e2e`       | Playwright and axe against the production build       |
| `npm run contract:check` | Compare the API contract copy with its pinned commit  |
| `npm run contract:types` | Generate the API types from the contract copy         |

`npm run test:e2e` needs `npm run build` first. CI runs every script above on each pull request.

## Project structure

```
src/app            routes and layouts
src/features/<f>   one folder per area of the product
src/server         server-only code: API client, sessions, data access, environment
src/shared         UI and pure helpers used by several features
e2e/               end-to-end tests
contract/          pinned copy of the API contract (see contract/README.md)
scripts/           repository scripts run by npm
```

Dependencies point one way, `app` to `features` to `shared` and `server`, and a feature does not
import another feature. ESLint enforces this. Folders are created when their first file is added.
Decisions are recorded in [docs/adr](docs/adr).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
