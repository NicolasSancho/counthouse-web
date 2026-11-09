import { expect, test, type Page } from "@playwright/test";

import { signedInState } from "./session";

// The page policy (ADR 0010): only scripts with the response's nonce run, and the scripts they
// load. Each test that injects something also expects the violation, so a test cannot pass because
// the injection itself went wrong.

const TRAIL_RUNNER = "/products/00000000-0000-4000-8000-0b9d00000000";

type Recorded = Window & { violations?: string[]; injected?: boolean };

/** Records every violation the page reports, from before its first script. */
async function recordViolations(page: Page) {
  await page.addInitScript(() => {
    const w = window as Recorded;
    w.violations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      w.violations?.push(event.violatedDirective);
    });
  });
}

const violations = (page: Page) => page.evaluate(() => (window as Recorded).violations ?? []);
const injectedRan = (page: Page) => page.evaluate(() => (window as Recorded).injected === true);

async function enterDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Enter the demo" }).click();
  await expect(page).toHaveURL(/\/products$/);
}

async function expectEveryScriptHasTheNonce(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  const policy = response?.headers()["content-security-policy"] ?? "";
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce).toBeTruthy();

  const scripts = [...(await response!.text()).matchAll(/<script\b[^>]*>/g)].map(([tag]) => tag);
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.filter((tag) => !tag.includes(`nonce="${nonce}"`))).toEqual([]);
}

test("every script on the sign-in page carries the response's nonce", async ({ page }) => {
  await expectEveryScriptHasTheNonce(page, "/login");
});

test.describe("signed in", () => {
  test.use({ storageState: signedInState });

  for (const path of ["/products", TRAIL_RUNNER]) {
    test(`every script on ${path} carries the response's nonce`, async ({ page }) => {
      await expectEveryScriptHasTheNonce(page, path);
    });
  }

  test("a script injected into a page does not run", async ({ page }) => {
    await recordViolations(page);
    await page.route(`**${TRAIL_RUNNER}`, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        "<body",
        "<script>window.injected = true</script><body"
      );
      await route.fulfill({ response, body: html });
    });

    await page.goto(TRAIL_RUNNER);
    await expect(page.getByRole("heading", { level: 1, name: "Trail Runner" })).toBeVisible();

    await expect.poll(() => violations(page)).toContain("script-src-elem");
    expect(await injectedRan(page)).toBe(false);
  });
});

test("sign-in, the list, a product and sign-out report no violations", async ({ page }) => {
  await recordViolations(page);
  await enterDemo(page);
  await expect(page.getByRole("table")).toBeVisible();

  await page.getByRole("link", { name: "Trail Runner" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Trail Runner" })).toBeVisible();
  expect(await violations(page)).toEqual([]);

  await page.getByRole("button", { name: /Account|Ana Torres/ }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Enter the demo" })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test("an inline handler inserted after sign-in does not run", async ({ page }) => {
  // Sign-in is a client navigation, so the document, and its policy, is still the sign-in page's.
  await recordViolations(page);
  await enterDemo(page);

  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<img alt="" src="/missing.png" onerror="window.injected = true">`
    );
  });

  await expect.poll(() => violations(page)).toContain("script-src-attr");
  expect(await injectedRan(page)).toBe(false);
});
