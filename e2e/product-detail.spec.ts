import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations } from "./axe";
import { apiDownURL, martaState, signedInState } from "./session";

// Ids of named demo products in `src/server/mock/demo-products.ts`. Northwind's Trail Runner has an
// archived variant and Trail Boot a sold-out size; Acme's products are written out by hand.
const TRAIL_RUNNER = "/products/00000000-0000-4000-8000-0b9d00000000";
const TRAIL_BOOT = "/products/00000000-0000-4000-8000-0b9d00000002";
const ACME_ANVIL = "/products/00000000-0000-4000-8000-7a1e00000000";
const ACME_WRECKING_BAR = "/products/00000000-0000-4000-8000-7a1e00000002";
const ACME_GOGGLES = "/products/00000000-0000-4000-8000-7a1e00000005";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const variants = (page: Page) => page.getByRole("region", { name: "Variants table" });
const variantRows = (page: Page) =>
  variants(page)
    .getByRole("row")
    .filter({ has: page.getByRole("cell") });
/** The value next to a label in the Details card. */
const fact = (page: Page, term: string) => page.locator(`dt:text-is("${term}") + dd`);
const backLink = (page: Page) => page.getByRole("link", { name: "Back to products" });
const notFound = (page: Page) => page.getByText("Product not found.");
const activeElement = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement;
    return active ? `${active.tagName.toLowerCase()}${active.id ? `#${active.id}` : ""}` : "";
  });

test.use({ storageState: signedInState });

test("a name in the list opens the product", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("link", { name: "Trail Runner", exact: true }).click();

  await expect(page).toHaveURL(TRAIL_RUNNER);
  await expect(heading(page)).toHaveText("Trail Runner");
  await expect(page).toHaveTitle("Trail Runner · Products · Counthouse");
  await expect(fact(page, "Price")).toHaveText("€24.00");
});

test("the way back returns to the list as it was left", async ({ page }) => {
  await page.goto("/products?q=trail&status=ACTIVE");
  await page.getByRole("link", { name: "Trail Runner", exact: true }).click();
  await expect(page).toHaveURL(`${TRAIL_RUNNER}?q=trail&status=ACTIVE`);

  await backLink(page).click();
  await expect(page).toHaveURL("/products?q=trail&status=ACTIVE");
  await expect(page.getByRole("searchbox", { name: /search products/i })).toHaveValue("trail");
});

test("after opening a product, focus is on the page, and Tab reaches the way back", async ({
  page,
}) => {
  await page.goto("/products");
  await page.getByRole("link", { name: "Trail Runner", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(heading(page)).toHaveText("Trail Runner");

  await expect.poll(() => activeElement(page)).toBe("main#main");
  await page.keyboard.press("Tab");
  await expect(backLink(page)).toBeFocused();
});

test("a first load leaves focus where the browser puts it", async ({ page }) => {
  await page.goto(TRAIL_RUNNER);
  await expect(heading(page)).toHaveText("Trail Runner");

  expect(await activeElement(page)).toBe("body");
});

test("variants show one column per option, archived ones last", async ({ page }) => {
  await page.goto(TRAIL_RUNNER);

  await expect(variants(page).getByRole("columnheader")).toHaveText([
    "SKU",
    "Color",
    "Size",
    "Stock",
    "Status",
  ]);
  await expect(variantRows(page).last()).toContainText("Archived");
  await expect(page.getByText("1 active · 1 archived")).toBeVisible();
});

test("an active variant with no stock reads Out of stock", async ({ page }) => {
  await page.goto(TRAIL_BOOT);

  await expect(variantRows(page).filter({ hasText: "Out of stock" })).toHaveCount(1);
});

test("an uppercase id opens the same product", async ({ page }) => {
  await page.goto(TRAIL_RUNNER.toUpperCase().replace("/PRODUCTS/", "/products/"));

  await expect(heading(page)).toHaveText("Trail Runner");
});

test("each card is a region named by its heading", async ({ page }) => {
  await page.goto(TRAIL_RUNNER);
  await expect(heading(page)).toHaveText("Trail Runner");

  for (const name of ["Description", "Variants", "Status", "Details"]) {
    await expect(page.getByRole("region", { name, exact: true })).toHaveCount(1);
  }
});

test.describe("as Acme", () => {
  test.use({ storageState: martaState });

  test("a product without options or description shows only what it has", async ({ page }) => {
    await page.goto(ACME_ANVIL);
    await expect(variants(page).getByRole("columnheader")).toHaveText(["SKU", "Stock", "Status"]);
    await expect(fact(page, "Price")).toContainText("US$");

    await page.goto(ACME_GOGGLES);
    await expect(heading(page)).toHaveText("Safety Goggles");
    await expect(page.getByRole("heading", { name: "Description" })).toBeHidden();
  });

  for (const width of [375, 1280]) {
    test(`long text wraps instead of widening the page at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      // Its description holds a long link with no spaces.
      await page.goto(ACME_WRECKING_BAR);
      await expect(heading(page)).toHaveText("Wrecking Bar");
      // A name with no spaces, the worst case for the heading.
      await heading(page).evaluate((element) => {
        element.textContent = "Wrecking".repeat(40);
      });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBe(0);
    });
  }
});

for (const [name, path] of [
  ["an unknown id", "/products/00000000-0000-4000-8000-0b9d99999999"],
  ["an id that is not a UUID", "/products/not-a-product"],
  ["another tenant's product", ACME_ANVIL],
] as const) {
  test(`${name} shows Product not found inside the shell`, async ({ page }) => {
    await page.goto(path);

    await expect(notFound(page)).toBeVisible();
    await expect(page).toHaveTitle("Product not found · Counthouse");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  });
}

test("Product not found also returns to the list as it was left", async ({ page }) => {
  await page.goto("/products/not-a-product?q=boot");
  await page.getByRole("link", { name: "Back to products" }).click();

  await expect(page).toHaveURL("/products?q=boot");
});

test("with the API down, the product says so and Retry loads it again", async ({ page }) => {
  await page.goto(`${apiDownURL}${TRAIL_RUNNER}`);
  await expect(page.getByText("This product could not load.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

  const reload = page.waitForRequest(
    (request) => request.isNavigationRequest() && request.url() === `${apiDownURL}${TRAIL_RUNNER}`
  );
  await page.getByRole("link", { name: "Retry" }).click();
  await reload;
  await expect(page.getByText("This product could not load.")).toBeVisible();
});

test("without a session, a product link goes to sign-in", async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  await page.goto(TRAIL_RUNNER);
  await expect(page).toHaveURL(/\/login$/);
  await context.close();
});

test("without JavaScript, signed-in pages say they need it", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: signedInState,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();

  await page.goto(TRAIL_RUNNER);
  // Playwright's text matchers skip `<noscript>` content, so this reads what the browser renders.
  expect(await page.locator("main").innerText()).toContain("Counthouse needs JavaScript.");
  await context.close();
});

test("with JavaScript, the notice stays hidden", async ({ page }) => {
  await page.goto(TRAIL_RUNNER);
  await expect(heading(page)).toHaveText("Trail Runner");
  expect(await page.locator("main").innerText()).not.toContain("Counthouse needs JavaScript.");
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("a product has no WCAG A or AA violations", async ({ page }) => {
      await page.goto(TRAIL_RUNNER);
      await expect(variantRows(page)).toHaveCount(2);
      await expectNoAxeViolations(page);
    });

    test("Product not found has no WCAG A or AA violations", async ({ page }) => {
      await page.goto("/products/not-a-product");
      await expect(notFound(page)).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
}
