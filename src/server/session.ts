import "server-only";

import { createHash } from "node:crypto";

import { cookies } from "next/headers";

import type { TokenResponse } from "@/server/api/schema";

/**
 * The session is the API's two tokens, each in its own cookie. The `__Host-` prefix makes the
 * browser refuse the cookie unless it is `secure`, has `path=/` and no `domain`, so a subdomain
 * cannot set or overwrite it. Browsers treat `http://localhost` as secure, so it works in
 * development too. Only this module defines these cookies.
 */
export const ACCESS_COOKIE = "__Host-ch_access";
export const REFRESH_COOKIE = "__Host-ch_refresh";

/**
 * The access cookie expires this many seconds before the token, so a request never reaches the
 * API with a token that expires on the way.
 */
const EXPIRY_MARGIN_SECONDS = 30;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
} as const;

/** What deletes each session cookie, with its full options (see `clearSession()`). */
export const SESSION_COOKIES = [
  { name: ACCESS_COOKIE, ...COOKIE_OPTIONS },
  { name: REFRESH_COOKIE, ...COOKIE_OPTIONS },
];

const fingerprint = (refreshToken: string) =>
  createHash("sha256").update(refreshToken).digest("base64url").slice(0, 16);

/**
 * The access cookie, bound to the refresh token it belongs to: its value starts with a fingerprint
 * of that token. A refresh still in flight when another tab signs in or out writes its cookie
 * afterwards, and the binding stops that token from being read as part of the new session.
 */
export function accessCookie(accessToken: string, expiresIn: number, refreshToken: string) {
  return {
    name: ACCESS_COOKIE,
    value: `${fingerprint(refreshToken)}.${accessToken}`,
    ...COOKIE_OPTIONS,
    maxAge: Math.max(expiresIn - EXPIRY_MARGIN_SECONDS, 0),
  };
}

/** The access token in a cookie value, if the cookie belongs to this refresh token. */
export function unwrapAccessToken(
  value: string | undefined,
  refreshToken: string | undefined
): string | undefined {
  if (!value || !refreshToken) return undefined;
  const prefix = `${fingerprint(refreshToken)}.`;
  if (!value.startsWith(prefix)) return undefined;
  return value.slice(prefix.length) || undefined;
}

export async function writeSession(tokens: TokenResponse): Promise<void> {
  const store = await cookies();
  store.set(accessCookie(tokens.accessToken, tokens.expiresIn, tokens.refreshToken));
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: tokens.refreshExpiresIn,
  });
}

export async function readAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return unwrapAccessToken(store.get(ACCESS_COOKIE)?.value, store.get(REFRESH_COOKIE)?.value);
}

export async function readRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

/**
 * Deletes both cookies. The options are passed in full: `cookies().delete(name)` sends the
 * deletion without `secure`, and the browser ignores it for a `__Host-` cookie.
 */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  for (const cookie of SESSION_COOKIES) store.delete(cookie);
}
