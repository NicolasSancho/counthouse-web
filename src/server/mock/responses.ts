import "server-only";

import { randomUUID } from "node:crypto";

import type { ErrorCode, FieldError, Me, ProblemDetail } from "@/server/api/schema";
import { tenants, users } from "@/server/mock/demo-data";
import { verify } from "@/server/mock/tokens";

/** A Problem Details body and the init that sends it as `application/problem+json`. */
export type Problem = [body: ProblemDetail, init: { headers: Record<string, string> }];

export function findMe(userId: string): Me | undefined {
  const user = users.find((candidate) => candidate.id === userId);
  const tenant = tenants.find((candidate) => candidate.id === user?.tenantId);
  return user && tenant ? { user, tenant } : undefined;
}

type Session = { ok: true; me: Me } | { ok: false; problem: Problem };

/** The user behind a request's bearer token, or the 401 to answer with. */
export function authenticate(request: Request): Session {
  const token = /^Bearer (\S+)$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token) return { ok: false, problem: tokenProblem("TOKEN_INVALID") };

  const result = verify(token, "access");
  if (!result.ok) return { ok: false, problem: tokenProblem(result.code) };

  const me = findMe(result.sub);
  return me ? { ok: true, me } : { ok: false, problem: tokenProblem("TOKEN_INVALID") };
}

export function validationFailed(errors: FieldError[]): Problem {
  const detail =
    errors.length === 1 ? "1 field is invalid." : `${errors.length} fields are invalid.`;
  return problem(400, "VALIDATION_FAILED", "Validation failed", { detail, errors });
}

export function tokenProblem(code: "TOKEN_EXPIRED" | "TOKEN_INVALID"): Problem {
  return problem(401, code, code === "TOKEN_EXPIRED" ? "Token expired" : "Token invalid");
}

export function problem(
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
