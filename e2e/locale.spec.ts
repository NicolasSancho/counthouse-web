import { expect, test, type Page } from "@playwright/test";

import { martaState, signedInState } from "./session";

// Named demo products from `src/server/mock/demo-products.ts`: Northwind's Trail Runner costs
// €24.00 and changed on 20 October 2026 at 16:02 UTC; Acme's Anvil costs $249.00.
const TRAIL_RUNNER = "/products/00000000-0000-4000-8000-0b9d00000000";
const ACME_ANVIL = "/products/00000000-0000-4000-8000-7a1e00000000";

const price = (page: Page) => page.locator('dt:text-is("Price") + dd');
// Both products last changed at this instant, which the page states in its `<time>` element.
const updated = (page: Page) => page.locator('time[datetime="2026-10-20T16:02:11.000Z"]');

test.describe("a reader in Germany", () => {
  test.use({ storageState: signedInState, locale: "de-DE" });

  test("sees German prices and English dates", async ({ page }) => {
    await page.goto(TRAIL_RUNNER);

    // Intl puts a no-break space between the amount and the symbol.
    await expect(price(page)).toHaveText("24,00 €");
    await expect(updated(page)).toHaveText("20 Oct 2026, 16:02 UTC");

    await page.goto("/products");
    await expect(page.getByRole("row", { name: /Trail Runner/ })).toContainText("24,00 €");
  });
});

test.describe("a reader in the US", () => {
  test.use({ storageState: martaState, locale: "en-US" });

  test("sees dollars and US dates", async ({ page }) => {
    await page.goto(ACME_ANVIL);

    await expect(price(page)).toHaveText("$249.00");
    await expect(updated(page)).toHaveText("Oct 20, 2026, 4:02 PM UTC");
  });
});

test.describe("a reader in Poland", () => {
  // What a browser with a Polish interface and US English as a second language sends.
  test.use({
    storageState: signedInState,
    locale: "pl-PL",
    extraHTTPHeaders: { "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7" },
  });

  test("sees Polish prices, not the US formats further down the header", async ({ page }) => {
    await page.goto(TRAIL_RUNNER);

    await expect(price(page)).toHaveText("24,00 €");
    await expect(updated(page)).toHaveText("20 Oct 2026, 16:02 UTC");
  });
});
