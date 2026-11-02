import { readFileSync } from "node:fs";

import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { Middleware } from "openapi-fetch";
import { parse } from "yaml";

/**
 * Test-only: an `openapi-fetch` middleware that checks every response against the pinned contract
 * (`contract/openapi.yaml`): the status is declared for the operation, the content type is one it
 * lists, the body matches its JSON Schema (formats included), and a Problem Details `status`
 * equals the HTTP status. A mismatch throws, so the request that received it fails its test.
 */
export function contractChecks(): Middleware {
  return {
    async onResponse({ request, response, schemaPath }) {
      const failure = await check(request.method.toLowerCase(), schemaPath, response.clone());
      if (failure) {
        throw new Error(`${request.method} ${schemaPath} ${response.status}: ${failure}`);
      }
    },
  };
}

type ResponseObject = { $ref?: string; content?: Record<string, unknown> };
type Contract = {
  paths: Record<string, Record<string, { responses: Record<string, ResponseObject> }>>;
  components: { responses: Record<string, ResponseObject> };
};

const contract = parse(
  readFileSync(new URL("../../../contract/openapi.yaml", import.meta.url), "utf8")
) as Contract;

// OpenAPI 3.1 schemas are JSON Schema 2020-12. The contract is added whole, so its top-level
// OpenAPI fields are declared as keywords; everything else stays strict, and a format Ajv does not
// know throws instead of passing unchecked. Only response schemas are compiled.
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const field of ["openapi", "info", "servers", "security", "tags", "paths", "components"]) {
  ajv.addKeyword(field);
}
ajv.addSchema(contract, "contract");

const validators = new Map<string, ValidateFunction>();

async function check(method: string, path: string, response: Response) {
  const operation = contract.paths[path]?.[method];
  if (!operation) return "the operation is not in the contract";

  const status = String(response.status);
  let pointer = `/paths/${escape(path)}/${method}/responses/${status}`;
  let declared = operation.responses[status];
  if (!declared) return "the status is not declared for this operation";
  if (declared.$ref) {
    pointer = declared.$ref.slice(1);
    const name = declared.$ref.split("/").at(-1) ?? "";
    declared = contract.components.responses[name];
    if (!declared) return `${pointer} is missing from the contract`;
  }

  const text = await response.text();
  if (!declared.content) return text === "" ? undefined : "the status declares no body";

  const mediaType = response.headers.get("Content-Type")?.split(";")[0]?.trim() ?? "";
  if (!(mediaType in declared.content)) {
    return `content type "${mediaType}" is not one of ${Object.keys(declared.content).join(", ")}`;
  }

  const schemaPointer = `${pointer}/content/${escape(mediaType)}/schema`;
  let validate = validators.get(schemaPointer);
  if (!validate) {
    validate = ajv.compile({ $ref: `contract#${schemaPointer}` });
    validators.set(schemaPointer, validate);
  }

  const body: unknown = JSON.parse(text);
  if (!validate(body)) return ajv.errorsText(validate.errors);

  const problemStatus = (body as { status?: unknown }).status;
  if (response.status >= 400 && problemStatus !== response.status) {
    return `the Problem Details status is ${String(problemStatus)}`;
  }
  return undefined;
}

/** JSON Pointer escaping (RFC 6901). */
function escape(segment: string) {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}
