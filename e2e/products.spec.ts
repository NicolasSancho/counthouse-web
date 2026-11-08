import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations } from "./axe";
import { apiDownURL, martaState, REFRESH_COOKIE, signedInState } from "./session";

const search = (page: Page) => page.getByRole("searchbox", { name: /search products/i });
const rows = (page: Page) => page.getByRole("row").filter({ has: page.getByRole("cell") });
const firstName = (page: Page) => rows(page).first().getByRole("cell").first();

/** Holds every navigation's answer, so a test can act while a change is loading. */
const slowNavigations = (page: Page) =>
  page.route("**/products*", async (route) => {
    if (route.request().headers().rsc) await new Promise((done) => setTimeout(done, 500));
    await route.continue();
  });

test.use({ storageState: signedInState });

test("shows the tenant's products with their prices and a page of 20", async ({ page }) => {
  await page.goto("/products");

  await expect(rows(page)).toHaveCount(20);
  await expect(firstName(page)).toHaveText("Trail Runner");
  // Northwind sells in euros.
  await expect(rows(page).first()).toContainText("€");
  await expect(page.getByRole("status")).toHaveText(
    /^Showing 1 to 20 of \d+ products, newest first\.$/
  );
});

test("the Acme demo sees its own products in its own currency", async ({ browser }) => {
  const context = await browser.newContext({ storageState: martaState });
  const page = await context.newPage();
  await page.goto("/products");

  await expect(page.getByRole("cell", { name: "Anvil" })).toBeVisible();
  await expect(rows(page).first()).toContainText("US$");
  await expect(page.getByRole("cell", { name: "Trail Runner" })).toBeHidden();
  await context.close();
});

test("a sort keeps focus on its link, and rows stay on screen while loading", async ({ page }) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);

  const sortLink = page.getByRole("link", { name: "Name" });
  await sortLink.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
    "aria-sort",
    "ascending"
  );
  await expect(page).toHaveURL(/sort=name%2Casc/);
  await expect(firstName(page)).toHaveText("Alpine Boot");
  await expect(sortLink).toBeFocused();
  await expect(page.getByRole("status")).toHaveCount(1);
});

test("rows stay on screen and the list is marked busy while a change loads", async ({ page }) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);
  await slowNavigations(page);

  await page.getByRole("link", { name: "Name" }).click();

  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await expect(rows(page)).toHaveCount(20);
  await expect(firstName(page)).toHaveText("Trail Runner");
  await expect(firstName(page)).toHaveText("Alpine Boot");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("by name, ascending");
});

test("a sort right after typing keeps both", async ({ page }) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);

  await search(page).pressSequentially("runner");
  await page.getByRole("link", { name: "Price" }).click();

  await expect(page).toHaveURL(/q=runner/);
  await expect(page).toHaveURL(/sort=basePriceCents%2Casc/);
  // Nothing waiting to fire undoes it.
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/sort=basePriceCents%2Casc/);
});

test("a filter changed while a sort loads keeps the sort", async ({ page }) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);
  await slowNavigations(page);
  const status = page.getByRole("combobox", { name: "Status" });

  await page.getByRole("link", { name: "Name" }).click();
  await status.selectOption("DRAFT");
  // The select shows the choice at once, before the answer.
  await expect(status).toHaveValue("DRAFT");
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();

  await expect(page).toHaveURL(/status=DRAFT/);
  await expect(page).toHaveURL(/sort=name%2Casc/);
});

test("a sort while the next page loads goes to the first page", async ({ page }) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);
  await slowNavigations(page);

  await page.getByRole("link", { name: /next/i }).click();
  await page.getByRole("link", { name: "Price" }).click();

  await expect(page).toHaveURL(/sort=basePriceCents%2Casc$/);
  await expect(page.getByRole("status")).toHaveText(/^Showing 1 to /);
});

test("Next with typed text waiting goes to the first page of that search", async ({ page }) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);

  await search(page).pressSequentially("r");
  await page.getByRole("link", { name: /next/i }).click();

  await expect(page).toHaveURL(/\?q=r$/);
});

test("Clear filters also drops text that has not gone out yet", async ({ browser }) => {
  const context = await browser.newContext({ storageState: martaState });
  const page = await context.newPage();
  // Acme has no archived products, so this is an empty list with no search in the URL.
  await page.goto("/products?status=ARCHIVED");
  const clear = page.getByRole("link", { name: "Clear filters" });
  await expect(clear).toBeVisible();

  await search(page).pressSequentially("abc");
  await clear.click();

  await expect(page).toHaveURL(/\/products$/);
  await expect(search(page)).toHaveValue("");
  await context.close();
});

test("a search abandoned with Back leaves the box and later filters clean", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("link", { name: /next/i }).click();
  await expect(page.getByRole("status")).toHaveText(/^Showing 21 to /);
  await slowNavigations(page);

  const sent = page.waitForRequest((request) => request.url().includes("q=boot"));
  await search(page).pressSequentially("boot");
  await sent;
  await page.goBack();

  await expect(page).toHaveURL(/\/products$/);
  await expect(search(page)).toHaveValue("");
  await page.getByRole("combobox", { name: "Status" }).selectOption("DRAFT");
  await expect(page).toHaveURL(/\?status=DRAFT$/);
});

test("the next page keeps the sort, and Back returns", async ({ page }) => {
  await page.goto("/products?sort=name,asc");
  await page.getByRole("link", { name: /next/i }).click();

  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/sort=name/);
  await expect(page.getByRole("status")).toHaveText(/^Showing 21 to /);

  await page.goBack();
  await expect(page.getByRole("status")).toHaveText(/^Showing 1 to /);
});

test("searching needs no action, keeps focus and leaves no history behind", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("link", { name: /next/i }).click();
  await expect(page.getByRole("status")).toHaveText(/^Showing 21 to /);

  await search(page).pressSequentially("runner", { delay: 30 });

  await expect(page).toHaveURL(/\?q=runner$/);
  await expect(firstName(page)).toContainText("Runner");
  await expect(search(page)).toBeFocused();

  // The search replaced page 2 in the history, so Back skips it.
  await page.goBack();
  await expect(page).toHaveURL(/\/products$/);
  await expect(search(page)).toHaveValue("");
});

test("a ctrl-click on a sort link opens a new tab and leaves this one alone", async ({
  page,
  context,
}) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);

  const opened = context.waitForEvent("page");
  await page.getByRole("link", { name: "Name" }).click({ modifiers: ["ControlOrMeta"] });

  await expect(await opened).toHaveURL(/sort=name%2Casc/);
  await expect(page).toHaveURL(/\/products$/);
});

test("a late answer does not overwrite what is still being typed", async ({ page }) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);

  // The search for "tr" goes out after the pause. Its answer lands while typing goes on, with gaps
  // too short for the next search to start.
  const sent = page.waitForRequest(
    (request) => request.url().includes("q=tr") && "rsc" in request.headers()
  );
  await search(page).pressSequentially("tr", { delay: 20 });
  await sent;
  await search(page).pressSequentially("ail runner", { delay: 100 });

  await expect(search(page)).toHaveValue("trail runner");
  await expect(page).toHaveURL(/q=trail\+runner$/);
  await expect(rows(page)).toHaveCount(1);
});

test("the status filter applies on change and can show archived products", async ({ page }) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);

  await page.getByRole("combobox", { name: "Status" }).selectOption("ARCHIVED");

  await expect(page).toHaveURL(/status=ARCHIVED/);
  await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("ARCHIVED");
  await expect(rows(page).first()).toContainText("Archived");
});

test("no results offers to clear, which also empties the box, and Back restores it", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);
  await search(page).fill("nothing like this");

  await expect(page.getByText("No products match your search.")).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();

  await expect(page).toHaveURL(/\/products$/);
  await expect(rows(page)).toHaveCount(20);
  await expect(search(page)).toHaveValue("");

  await page.goBack();
  await expect(search(page)).toHaveValue("nothing like this");
});

test("focus moves to the results when the link used disappears", async ({ page }) => {
  await page.goto("/products");
  await expect(rows(page)).toHaveCount(20);
  const results = page.locator("[aria-busy]");

  // The last page has no Next link.
  await page.getByRole("link", { name: /next/i }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText(/^Showing 21 to /);
  await expect(results).toBeFocused();

  await page.goto("/products?q=nothing");
  await page.getByRole("link", { name: "Clear filters" }).focus();
  await page.keyboard.press("Enter");
  await expect(rows(page)).toHaveCount(20);
  await expect(results).toBeFocused();
});

test("a page past the end links back to the first page", async ({ page }) => {
  await page.goto("/products?page=99");

  await page.getByRole("link", { name: "Go to the first page" }).click();
  await expect(rows(page)).toHaveCount(20);
});

test("bad URL values fall back to the defaults", async ({ page }) => {
  await page.goto("/products?sort=stock&status=SOLD&page=x");

  await expect(rows(page)).toHaveCount(20);
  await expect(firstName(page)).toHaveText("Trail Runner");
});

test.describe("with the API down", () => {
  test("the list says so inside the shell and the filters stay", async ({ page }) => {
    await page.goto(`${apiDownURL}/products`);

    await expect(page.getByText("Products could not load.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Retry" })).toBeVisible();
    await expect(search(page)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

    const retried = page.waitForRequest((request) => {
      const headers = request.headers();
      return "rsc" in headers && !("next-router-prefetch" in headers);
    });
    await page.getByRole("link", { name: "Retry" }).click();
    await retried;
    await expect(page.getByText("Products could not load.")).toBeVisible();
  });

  test("an unexpected failure keeps the shell", async ({ page, context }) => {
    // Only the refresh cookie: the proxy cannot renew it, so reading the session throws.
    const cookies = await context.cookies();
    await context.clearCookies();
    await context.addCookies(cookies.filter(({ name }) => name === REFRESH_COOKIE));

    await page.goto(`${apiDownURL}/products`);

    await expect(page.getByText("Something went wrong.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  });

  test("leaving the failed URL clears the error", async ({ page, context }) => {
    const cookies = await context.cookies();
    await context.clearCookies();
    await context.addCookies(cookies.filter(({ name }) => name === REFRESH_COOKIE));
    await page.goto(`${apiDownURL}/products?q=boot`);
    await expect(page.getByText("Something went wrong.")).toBeVisible();

    // The session is back, so the same page now fails in its usual way, with the API still down.
    await context.addCookies(cookies);
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Products" })
      .click();

    await expect(page.getByText("Products could not load.")).toBeVisible();
    await expect(page.getByText("Something went wrong.")).toBeHidden();
  });
});

test("a search cut at the limit in the middle of an emoji still reaches the API", async ({
  page,
}) => {
  await page.goto(`/products?q=${encodeURIComponent(`${"x".repeat(99)}😀`)}`);

  await expect(page.getByText("No products match your search.")).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("the list has no WCAG A or AA violations", async ({ page }) => {
      await page.goto("/products");
      await expect(rows(page)).toHaveCount(20);
      await expectNoAxeViolations(page);
    });

    test("an empty search has no WCAG A or AA violations", async ({ page }) => {
      await page.goto("/products?q=nothing");
      await expect(page.getByText("No products match your search.")).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
}
