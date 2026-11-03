# API contract

`openapi.yaml` is a pinned copy of the OpenAPI contract of the Counthouse API. The contract
belongs to [`counthouse-api`](https://github.com/Mfigueira98/counthouse-api) and changes there by
pull request. Never edit this copy by hand.

The pin is recorded once, in `package.json`: `config.contractRepo` names the repository and
`config.contractCommit` the commit the copy comes from. The contract version is `info.version` in
the copy itself.

## Scripts

| Command                  | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `npm run contract:check` | Fail if this copy differs from the contract at the pinned commit |
| `npm run contract:types` | Generate `src/server/api/schema.d.ts` from this copy             |

CI runs both on every pull request. It fails when the copy differs from the pinned commit, and when
the committed types differ from what `contract:types` generates.

The script passes these flags to `openapi-typescript`, and `src/server/api/schema.test-d.ts` makes
`npm run typecheck` fail if any of them is dropped:

- `--default-non-nullable false`: without it, a request field with a schema default becomes
  required in the generated type.
- `--root-types --root-types-no-schema-prefix`: each schema is also exported under its own name,
  such as `User` or `ProductDetail`. Shared responses and parameters keep a `Response` or
  `Parameter` prefix, such as `ResponseNotFound`.

## Updating the pin

1. The change is merged in `counthouse-api`.
2. Set `config.contractCommit` in `package.json` to the new commit on its `main`.
3. Copy `contract/openapi.yaml` from that commit, then run `npm run contract:check`.
4. Run `npm run contract:types` and fix the type errors it causes.
5. Remove the entries of "Known gaps" that the new contract settles.

A newer contract on `counthouse-api` does not fail CI here: the app moves to it on purpose, in its
own pull request.

## Known gaps

Places where contract 0.3.0 leaves a choice open, so the mock had to pick one. Candidates for
0.3.1:

- An unknown body field gets 400 `VALIDATION_FAILED`, but no `FieldErrorCode` fits it, so the mock
  sends no `errors` entry.
- The contract does not say whether emails are compared without regard to case. The mock matches
  them exactly.
- An empty password is answered with `REQUIRED`, although the schema's `minLength: 1` could also
  mean `TOO_SHORT`, and a password of spaces only is accepted as present.

## Trade-offs

- `contract:check` downloads the contract from GitHub, so CI needs network access, and it depends
  on `counthouse-api` staying public with the pinned commit reachable. If that changes, the check
  fails on every pull request until the pin is updated or the check is changed.
- Line endings of the copy are never converted (`.gitattributes`), because the check compares
  bytes.
