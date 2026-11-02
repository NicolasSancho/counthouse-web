import type { Page } from "@playwright/test";

/** The cookies saved by `auth.setup.ts`: a session for Ana Torres, Admin of Northwind. */
export const signedInState = "e2e/.auth/ana.json";

export const ACCESS_COOKIE = "__Host-ch_access";
export const REFRESH_COOKIE = "__Host-ch_refresh";

/** A second server of the same build in live mode, with the API unreachable (playwright.config). */
export const API_DOWN_PORT = 3201;
export const apiDownURL = `http://localhost:${API_DOWN_PORT}`;

export async function sessionCookies(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.filter(({ name }) => name === ACCESS_COOKIE || name === REFRESH_COOKIE);
}
