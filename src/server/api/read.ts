import "server-only";

import { redirect } from "next/navigation";

import { readTraceId, toProblem } from "@/server/api/problem";

/**
 * The outcome of a read a screen can show. A failure is a value, not a thrown error: an error
 * thrown in a Server Component reaches the browser without its details, trace id included.
 */
export type ApiRead<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "failed"; traceId?: string };

/** What an `openapi-fetch` call resolves to, as far as a read needs it. */
interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * Runs one API read and turns its answer into an `ApiRead`. A refused token (401) ends the
 * session at `/login/expired`. A 404 is logged at info level: a missing resource renders inside a
 * page that has already streamed, so its HTTP status is 200 and only this line records it.
 */
export async function readApi<T>(
  operation: string,
  call: () => Promise<FetchResult<T>>
): Promise<ApiRead<T>> {
  let result;
  try {
    result = await call();
  } catch (cause) {
    // A network failure, or a misconfigured deployment (see src/server/env.ts).
    console.error(`${operation} failed.`, cause);
    return { ok: false, reason: "failed" };
  }

  const { data, error, response } = result;
  if (data !== undefined) return { ok: true, value: data };
  if (response.status === 401) redirect("/login/expired");

  const problem = toProblem(error);
  if (response.status === 404) {
    console.info(`${operation} answered 404.`, problem?.traceId);
    return { ok: false, reason: "not-found" };
  }
  console.error(`${operation} answered ${response.status}.`, problem ?? error);
  return { ok: false, reason: "failed", traceId: problem?.traceId ?? readTraceId(error) };
}
