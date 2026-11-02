import "server-only";

/**
 * Mock tokens: unsigned base64url JSON. The mock checks their kind and expiry, not their
 * authenticity, and the web app never decodes them, so swapping in the API's real tokens changes
 * nothing outside the mock.
 */

export type TokenKind = "access" | "refresh";

/** Lifetimes in seconds, as in the contract: 15 minutes and 7 days. */
export const TOKEN_LIFETIME: Record<TokenKind, number> = {
  access: 900,
  refresh: 604_800,
};

type Payload = { sub: string; kind: TokenKind; exp: number };

export type VerifyResult =
  { ok: true; sub: string } | { ok: false; code: "TOKEN_EXPIRED" | "TOKEN_INVALID" };

/** `now` is in milliseconds, like `Date.now()`; `exp` is stored in seconds, like a JWT. */
export function issue(kind: TokenKind, sub: string, now = Date.now()): string {
  const payload: Payload = { sub, kind, exp: Math.floor(now / 1000) + TOKEN_LIFETIME[kind] };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function verify(token: string, kind: TokenKind, now = Date.now()): VerifyResult {
  const payload = decode(token);
  if (!payload || payload.kind !== kind) return { ok: false, code: "TOKEN_INVALID" };
  if (now >= payload.exp * 1000) return { ok: false, code: "TOKEN_EXPIRED" };
  return { ok: true, sub: payload.sub };
}

function decode(token: string): Payload | undefined {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;
  const { sub, kind, exp } = value as Record<string, unknown>;
  if (typeof sub !== "string" || typeof exp !== "number") return undefined;
  if (kind !== "access" && kind !== "refresh") return undefined;
  return { sub, kind, exp };
}
