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

## Scripts

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Development server                              |
| `npm run build`        | Production build                                |
| `npm run typecheck`    | Generate route types and check TypeScript       |
| `npm run lint`         | ESLint, with type-checked rules                 |
| `npm run format:check` | Prettier check (`npm run format` fixes)         |
| `npm test`             | Vitest                                          |
| `npm run test:e2e`     | Playwright and axe against the production build |

`npm run test:e2e` needs `npm run build` first. CI runs every script above on each pull request.

## Project structure

```
src/app            routes and layouts
src/features/<f>   one folder per area of the product
src/server         server-only code: API client, sessions, data access, environment
src/shared         UI and pure helpers used by several features
e2e/               end-to-end tests
```

Dependencies point one way, `app` to `features` to `shared` and `server`, and a feature does not
import another feature. ESLint enforces this. Folders are created when their first file is added.
Decisions are recorded in [docs/adr](docs/adr).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
