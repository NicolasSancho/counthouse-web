import { expectTypeOf } from "vitest";

import type { components, User } from "./schema";

type Schemas = components["schemas"];

// Checked by `npm run typecheck`, not run by Vitest. Each block guards a flag of the
// `contract:types` script.

// `--default-non-nullable false`: a request field with a schema default is optional for the
// client, because the server applies the default. Without the flag it becomes required.
expectTypeOf<Pick<Schemas["CreateProductRequest"], "description">>().toEqualTypeOf<{
  description?: string;
}>();
expectTypeOf<Pick<Schemas["VariantInput"], "initialStock">>().toEqualTypeOf<{
  initialStock?: number;
}>();

// `--root-types --root-types-no-schema-prefix`: each schema is also exported under its own name.
// The import above is the check: without either flag, `User` is not exported.
expectTypeOf<User>().toEqualTypeOf<Schemas["User"]>();
