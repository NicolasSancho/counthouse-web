import "server-only";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";

import { getApiClient } from "@/server/api/client";
import { readTraceId, toProblem } from "@/server/api/problem";
import type { FieldError, Me } from "@/server/api/schema";
import { clearSession, readAccessToken, readRefreshToken, writeSession } from "@/server/session";

/**
 * The data access layer for the session. Every call that needs the user passes the token
 * explicitly with `authorization()`: the shared API client holds no request state, so sign-in,
 * refresh and sign-out never send a bearer token by accident.
 */
export function authorization(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * The access token of this request. Without one it redirects: to `/login/expired` when a refresh
 * cookie shows there was a session, to `/login` otherwise. Cached per request with `cache()`.
 */
export const requireAccessToken = cache(async (): Promise<string> => {
  const token = await readAccessToken();
  if (token) return token;
  redirect((await readRefreshToken()) ? "/login/expired" : "/login");
});

/**
 * The signed-in user and their tenant, from `GET /auth/me`. A refused token (401) redirects to
 * `/login/expired`; any other failure throws for the nearest error boundary. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<Me> => {
  const token = await requireAccessToken();
  const { data, error, response } = await getApiClient().GET("/auth/me", {
    headers: authorization(token),
  });
  if (data) return data;
  if (response.status === 401) redirect("/login/expired");
  throw new Error(`GET /auth/me answered ${response.status}.`, {
    cause: toProblem(error) ?? error,
  });
});

export type SignInResult =
  | { ok: true }
  | { ok: false; reason: "credentials" }
  | { ok: false; reason: "fields"; errors: FieldError[] }
  | { ok: false; reason: "failed"; traceId?: string };

/**
 * Signs in with the API and stores the tokens in the session cookies. A refresh token already in
 * the cookies is about to be overwritten, so it is revoked too. That happens only after a
 * successful sign-in, so a wrong password leaves the session alone, and in `after()`, so a slow or
 * failing API cannot hold up the sign-in.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  let result;
  try {
    result = await getApiClient().POST("/auth/login", { body: { email, password } });
  } catch (cause) {
    // A network failure, or a misconfigured deployment (see src/server/env.ts).
    console.error("Sign-in request failed.", cause);
    return { ok: false, reason: "failed" };
  }

  const { data, error, response } = result;
  if (data) {
    const previousToken = await readRefreshToken();
    await writeSession(data);
    if (previousToken && previousToken !== data.refreshToken) {
      after(() => revokeRefreshToken(previousToken));
    }
    return { ok: true };
  }

  const problem = toProblem(error);
  if (problem?.code === "INVALID_CREDENTIALS") return { ok: false, reason: "credentials" };
  if (problem?.code === "VALIDATION_FAILED" && problem.errors?.length) {
    return { ok: false, reason: "fields", errors: problem.errors };
  }
  console.error(`Sign-in answered ${response.status}.`, problem ?? error);
  return { ok: false, reason: "failed", traceId: problem?.traceId ?? readTraceId(error) };
}

/**
 * Asks the API to revoke the refresh token, then deletes both cookies. The cookies are deleted
 * even when the API call fails, so the browser is signed out either way.
 */
export async function signOut(): Promise<void> {
  const refreshToken = await readRefreshToken();
  if (refreshToken) await revokeRefreshToken(refreshToken);
  await clearSession();
}

/** Logs a failure instead of throwing: the caller's sign-in or sign-out goes ahead either way. */
async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const { error, response } = await getApiClient().POST("/auth/logout", {
      body: { refreshToken },
    });
    if (!response.ok) console.error(`Revoking the token answered ${response.status}.`, error);
  } catch (cause) {
    console.error("Revoking the token failed.", cause);
  }
}
