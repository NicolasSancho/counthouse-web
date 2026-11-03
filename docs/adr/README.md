# Architecture decision records

Each record states the context, the decision and its consequences, as they were when the decision
was made.

- A record is written once. After that, only its status line changes: `Proposed`, `Accepted`, or a
  note that a later record supersedes or reopens all or part of it.
- A changed decision gets a new record, which names the one it supersedes.
- A "Not verified" section lists what was not verified when the decision was made. It is not
  updated afterwards.
- Implementation details live in the code, its comments and `CLAUDE.md`, not in the records.
- A `Proposed` record may still be edited until it is accepted.

| Record                                                                          | Status                             |
| ------------------------------------------------------------------------------- | ---------------------------------- |
| [0001 Code structure and enforced boundaries](0001-structure-and-boundaries.md) | Accepted                           |
| [0002 Cache Components](0002-cache-components.md)                               | Accepted                           |
| [0003 Backend for frontend](0003-backend-for-frontend.md)                       | Accepted; refresh reopened in 0004 |
| [0004 Authentication](0004-authentication.md)                                   | Proposed                           |
| [0005 Contract pin and mock server](0005-contract-pin-and-mock-server.md)       | Accepted                           |
| [0006 Tenant theme injection](0006-tenant-theme-injection.md)                   | Accepted                           |
