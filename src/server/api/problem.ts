import "server-only";

import type { ErrorCode, FieldError, FieldErrorCode, ProblemDetail } from "@/server/api/schema";

// Records rather than arrays, so a code added to the contract fails `typecheck` here until it is
// listed.
const ERROR_CODES: Record<ErrorCode, true> = {
  VALIDATION_FAILED: true,
  INVALID_CREDENTIALS: true,
  TOKEN_EXPIRED: true,
  TOKEN_INVALID: true,
  FORBIDDEN: true,
  NOT_FOUND: true,
  VERSION_CONFLICT: true,
  SKU_TAKEN: true,
  DUPLICATE_COMBINATION: true,
  NO_ACTIVE_VARIANT: true,
  INTERNAL_ERROR: true,
};

const FIELD_ERROR_CODES: Record<FieldErrorCode, true> = {
  REQUIRED: true,
  TOO_SHORT: true,
  TOO_LONG: true,
  OUT_OF_RANGE: true,
  INVALID_FORMAT: true,
  INVALID_VALUE: true,
  SKU_TAKEN: true,
  DUPLICATE_COMBINATION: true,
};

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCode = <T extends string>(codes: Record<T, true>, value: unknown): value is T =>
  typeof value === "string" && Object.hasOwn(codes, value);

/**
 * The error body of an API call, checked at runtime. `openapi-fetch` types every error body as
 * the contract's `ProblemDetail`, but when the body is not JSON (a proxy's HTML error page, for
 * example) it returns the raw text under that type. Returns `undefined` for anything that is not
 * a Problem Details object with a known `code`. Field errors with an unknown code are dropped.
 */
export function toProblem(value: unknown): ProblemDetail | undefined {
  if (!isObject(value)) return undefined;
  const { type, title, status, code, detail, traceId, errors } = value;
  if (typeof type !== "string" || typeof title !== "string" || typeof status !== "number") {
    return undefined;
  }
  if (!isCode(ERROR_CODES, code)) return undefined;

  const problem: ProblemDetail = { type, title, status, code };
  if (typeof detail === "string") problem.detail = detail;
  if (typeof traceId === "string") problem.traceId = traceId;
  if (Array.isArray(errors)) problem.errors = errors.filter(isFieldError);
  return problem;
}

function isFieldError(value: unknown): value is FieldError {
  return (
    isObject(value) &&
    typeof value.field === "string" &&
    typeof value.message === "string" &&
    isCode(FIELD_ERROR_CODES, value.code)
  );
}

/** The `traceId` of an error body that failed `toProblem`, when it still has one. */
export function readTraceId(value: unknown): string | undefined {
  return isObject(value) && typeof value.traceId === "string" ? value.traceId : undefined;
}
