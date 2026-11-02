import "server-only";

import { randomUUID } from "node:crypto";
import { createOpenApiHttp } from "openapi-msw";

import type { ErrorCode, FieldError, Me, paths, ProblemDetail } from "@/server/api/schema";
import { DEMO_PASSWORD, tenants, users } from "@/server/mock/demo-data";
import { issue, TOKEN_LIFETIME, verify } from "@/server/mock/tokens";

/**
 * The four auth operations of contract 0.3.0. `openapi-msw` types each path, request body and
 * response from the generated schema: `response(status)` accepts only the statuses the contract
 * lists for that operation, each with its own body. Errors are Problem Details with a fresh
 * `traceId`.
 */
export function createAuthHandlers(baseUrl: string) {
  const http = createOpenApiHttp<paths>({ baseUrl });

  return [
    http.post("/auth/login", async ({ request, response }) => {
      const body = await readBody(request, ["email", "password"]);
      if (!body.ok) return response(400).json(...body.problem);

      const errors: FieldError[] = [];
      const email = checkString(body.value.email, "email", errors);
      const password = checkString(body.value.password, "password", errors);
      if (email !== undefined && !EMAIL.test(email)) {
        errors.push({ field: "email", code: "INVALID_FORMAT", message: "must be an email" });
      }
      if (errors.length > 0) return response(400).json(...validationFailed(errors));

      // Exact match, no lowercasing: the contract does not say whether emails are case-insensitive.
      const user = users.find((candidate) => candidate.email === email);
      if (!user || password !== DEMO_PASSWORD) {
        return response(401).json(...problem(401, "INVALID_CREDENTIALS", "Invalid credentials"));
      }

      return response(200).json({
        accessToken: issue("access", user.id),
        refreshToken: issue("refresh", user.id),
        tokenType: "Bearer",
        expiresIn: TOKEN_LIFETIME.access,
        refreshExpiresIn: TOKEN_LIFETIME.refresh,
      });
    }),

    http.post("/auth/refresh", async ({ request, response }) => {
      const body = await readBody(request, ["refreshToken"]);
      if (!body.ok) return response(400).json(...body.problem);

      const errors: FieldError[] = [];
      const refreshToken = checkString(body.value.refreshToken, "refreshToken", errors);
      if (refreshToken === undefined) return response(400).json(...validationFailed(errors));

      const result = verify(refreshToken, "refresh");
      if (!result.ok) return response(401).json(...tokenProblem(result.code));
      if (!findMe(result.sub)) return response(401).json(...tokenProblem("TOKEN_INVALID"));

      return response(200).json({
        accessToken: issue("access", result.sub),
        tokenType: "Bearer",
        expiresIn: TOKEN_LIFETIME.access,
      });
    }),

    // The contract answers 204 even for an unknown or revoked token. Mock tokens are stateless,
    // so nothing is revoked.
    http.post("/auth/logout", async ({ request, response }) => {
      const body = await readBody(request, ["refreshToken"]);
      if (!body.ok) return response(400).json(...body.problem);

      const errors: FieldError[] = [];
      if (checkString(body.value.refreshToken, "refreshToken", errors) === undefined) {
        return response(400).json(...validationFailed(errors));
      }
      return response(204).empty();
    }),

    http.get("/auth/me", ({ request, response }) => {
      const token = /^Bearer (\S+)$/.exec(request.headers.get("Authorization") ?? "")?.[1];
      if (!token) return response(401).json(...tokenProblem("TOKEN_INVALID"));

      const result = verify(token, "access");
      if (!result.ok) return response(401).json(...tokenProblem(result.code));

      const me = findMe(result.sub);
      return me ? response(200).json(me) : response(401).json(...tokenProblem("TOKEN_INVALID"));
    }),
  ];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function findMe(userId: string): Me | undefined {
  const user = users.find((candidate) => candidate.id === userId);
  const tenant = tenants.find((candidate) => candidate.id === user?.tenantId);
  return user && tenant ? { user, tenant } : undefined;
}

/** A Problem Details body and the init that sends it as `application/problem+json`. */
type Problem = [body: ProblemDetail, init: { headers: Record<string, string> }];

type BodyResult = { ok: true; value: Record<string, unknown> } | { ok: false; problem: Problem };

/** A JSON object with only the allowed fields; the contract rejects unknown fields with 400. */
async function readBody(request: Request, allowed: readonly string[]): Promise<BodyResult> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    value = undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      ok: false,
      problem: problem(400, "VALIDATION_FAILED", "Validation failed", {
        detail: "The body must be a JSON object.",
      }),
    };
  }

  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    // The contract has no field code for an unknown field, so `errors` stays empty.
    return {
      ok: false,
      problem: problem(400, "VALIDATION_FAILED", "Validation failed", {
        detail: `Unknown fields: ${unknown.join(", ")}.`,
      }),
    };
  }
  return { ok: true, value: value as Record<string, unknown> };
}

/** A non-empty string, or `undefined` after recording why not. */
function checkString(value: unknown, field: string, errors: FieldError[]): string | undefined {
  if (value === undefined || value === "") {
    errors.push({ field, code: "REQUIRED", message: "must not be blank" });
    return undefined;
  }
  if (typeof value !== "string") {
    errors.push({ field, code: "INVALID_FORMAT", message: "must be a string" });
    return undefined;
  }
  return value;
}

function validationFailed(errors: FieldError[]): Problem {
  const detail =
    errors.length === 1 ? "1 field is invalid." : `${errors.length} fields are invalid.`;
  return problem(400, "VALIDATION_FAILED", "Validation failed", { detail, errors });
}

function tokenProblem(code: "TOKEN_EXPIRED" | "TOKEN_INVALID"): Problem {
  return problem(401, code, code === "TOKEN_EXPIRED" ? "Token expired" : "Token invalid");
}

function problem(
  status: number,
  code: ErrorCode,
  title: string,
  extra: Pick<ProblemDetail, "detail" | "errors"> = {}
): Problem {
  const body: ProblemDetail = {
    type: "about:blank",
    title,
    status,
    code,
    traceId: randomUUID().replaceAll("-", ""),
    ...extra,
  };
  return [body, { headers: { "Content-Type": "application/problem+json" } }];
}
