import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations } from "./axe";
import { BRAND_COOKIE, brandCookie, REFRESH_COOKIE } from "./session";

// As the browser reports them: Northwind's preset in src/app/globals.css, and the library's own
// primary (#00548a, #73b0e6), which a tenant without a preset keeps.
const northwind = { light: "rgb(31, 95, 74)", dark: "rgb(98, 160, 136)" };
const libraryPrimary = { light: "rgb(0, 84, 138)", dark: "rgb(115, 176, 230)" };

const currentLink = (page: Page) => page.getByRole("link", { name: "Products" });
const productsHeading = (page: Page) => page.getByRole("heading", { level: 1, name: "Products" });

async function signInWith(page: Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * Records the navigation's color on every frame from now on. Sign-in is a client navigation, so this
 * keeps running into the signed-in page. `toHaveCSS` retries, so it would not see a brief wrong color.
 */
async function recordFrames(page: Page) {
  await page.evaluate(() => {
    const frames: string[] = [];
    Object.assign(window, { navColors: frames });
    const sample = () => {
      const link = document.querySelector("a[aria-current='page']");
      if (link) frames.push(getComputedStyle(link).borderLeftColor);
      requestAnimationFrame(sample);
    };
    sample();
  });
}

const recordedFrames = (page: Page) =>
  page.evaluate(() => (window as unknown as { navColors: string[] }).navColors);

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    const signIns = {
      "the demo button": (page: Page) =>
        page.getByRole("button", { name: "Enter the demo" }).click(),
      "the form": (page: Page) => signInWith(page, "ana@counthouse.example"),
    };

    for (const [name, signIn] of Object.entries(signIns)) {
      test(`${name} lands in the tenant's brand on every frame`, async ({ page }) => {
        await page.goto("/login");
        await recordFrames(page);
        await signIn(page);
        await expect(productsHeading(page)).toBeVisible();

        await expect.poll(async () => (await recordedFrames(page)).length).toBeGreaterThan(5);
        expect(new Set(await recordedFrames(page))).toEqual(new Set([northwind[scheme]]));
      });
    }

    test("a tenant with no preset gets the default brand", async ({ page }) => {
      await page.goto("/login");
      await signInWith(page, "marta@counthouse.example");
      await expect(productsHeading(page)).toBeVisible();

      await expect(currentLink(page)).toHaveCSS("border-left-color", libraryPrimary[scheme]);
      expect(await brandCookie(page)).toBeUndefined();
      await expectNoAxeViolations(page);
    });
  });
}

test("signing in to another tenant over a session removes the previous brand", async ({ page }) => {
  await page.goto("/login");

  const other = await page.context().newPage();
  await other.goto("/login");
  await other.getByRole("button", { name: "Enter the demo" }).click();
  await expect(productsHeading(other)).toBeVisible();
  expect((await brandCookie(page))?.value).toBe("northwind");
  await other.close();

  await signInWith(page, "marta@counthouse.example");
  await expect(productsHeading(page)).toBeVisible();
  await page.reload();
  await expect(currentLink(page)).toHaveCSS("border-left-color", libraryPrimary.light);
  expect(await brandCookie(page)).toBeUndefined();
});

test("sign out deletes the brand", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Enter the demo" }).click();
  await page.getByRole("button", { name: /Ana Torres/ }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await brandCookie(page)).toBeUndefined();
});

test("a refresh the API refuses deletes the brand", async ({ page }) => {
  const cookie = { domain: "localhost", path: "/", httpOnly: true, secure: true };
  await page.context().addCookies([
    { ...cookie, name: REFRESH_COOKIE, value: "any" },
    { ...cookie, name: BRAND_COOKIE, value: "northwind" },
  ]);
  await page.goto("/products");
  await expect(page).toHaveURL(/\/login\/expired$/);
  expect(await brandCookie(page)).toBeUndefined();
});
