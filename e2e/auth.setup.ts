import { expect, test as setup } from "@playwright/test";

import {
  ACCESS_COOKIE,
  martaState,
  REFRESH_COOKIE,
  sessionCookies,
  signedInState,
  signInAsMarta,
} from "./session";

setup("sign in with the demo and save the session", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Enter the demo" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("button", { name: "Ana Torres" })).toBeVisible();

  const now = Date.now() / 1000;
  const cookies = await sessionCookies(page);
  const attributes = { httpOnly: true, secure: true, sameSite: "Lax", path: "/" };
  const access = cookies.find(({ name }) => name === ACCESS_COOKIE);
  const refresh = cookies.find(({ name }) => name === REFRESH_COOKIE);
  expect(access).toMatchObject(attributes);
  expect(refresh).toMatchObject(attributes);
  // 30 seconds before the 15-minute token expires, and the refresh token's 7 days.
  expect(access?.expires).toBeCloseTo(now + 870, -1);
  expect(refresh?.expires).toBeCloseTo(now + 604_800, -1);

  await page.context().storageState({ path: signedInState });
});

setup("sign in as Marta of Acme and save the session", async ({ page }) => {
  await signInAsMarta(page);
  await expect(page.getByRole("button", { name: "Marta Silva" })).toBeVisible();
  await page.context().storageState({ path: martaState });
});
