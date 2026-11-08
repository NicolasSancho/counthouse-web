import { createHash } from "node:crypto";

import type { Page } from "@playwright/test";

/** The cookies saved by `auth.setup.ts`: a session for Ana Torres, Admin of Northwind. */
export const signedInState = "e2e/.auth/ana.json";
/** The cookies saved by `auth.setup.ts` for Marta Silva, Admin of Acme, which sells in US dollars. */
export const martaState = "e2e/.auth/marta.json";

export const ACCESS_COOKIE = "__Host-ch_access";
export const REFRESH_COOKIE = "__Host-ch_refresh";
export const BRAND_COOKIE = "__Host-ch_brand";

/** A second server of the same build in live mode, with the API unreachable (playwright.config). */
export const API_DOWN_PORT = 3201;
export const apiDownURL = `http://localhost:${API_DOWN_PORT}`;

export async function sessionCookies(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.filter(({ name }) => name === ACCESS_COOKIE || name === REFRESH_COOKIE);
}

export async function brandCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find(({ name }) => name === BRAND_COOKIE);
}

/** An access cookie value bound to this refresh token, as `src/server/session.ts` writes it. */
export function boundAccess(accessToken: string, refreshToken: string) {
  const fingerprint = createHash("sha256").update(refreshToken).digest("base64url").slice(0, 16);
  return `${fingerprint}.${accessToken}`;
}

/** Signs in as Marta Silva through the sign-in page. Tests use `martaState` instead. */
export async function signInAsMarta(page: Page) {
  await page.goto("/login");
  await page.getByText("Other demo accounts").click();
  await page.getByRole("listitem").filter({ hasText: "Marta Silva" }).getByRole("button").click();
  await page.waitForURL(/\/products$/);
}
