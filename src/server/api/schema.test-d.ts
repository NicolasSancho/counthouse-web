import { expectTypeOf } from "vitest";

import type { components } from "./schema";

type Schemas = components["schemas"];

// Checked by `npm run typecheck`, not run by Vitest.
// A request field with a schema default is optional for the client: the server applies the
// default. `openapi-typescript` makes such fields required unless it runs with
// `--default-non-nullable false` (see the `contract:types` script).
expectTypeOf<Pick<Schemas["CreateProductRequest"], "description">>().toEqualTypeOf<{
  description?: string;
}>();
expectTypeOf<Pick<Schemas["VariantInput"], "initialStock">>().toEqualTypeOf<{
  initialStock?: number;
}>();
