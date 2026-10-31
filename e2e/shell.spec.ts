import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The default brand in src/app/globals.css, as the browser reports it.
const brandColor = { light: "rgb(107, 76, 174)", dark: "rgb(159, 130, 233)" };
const narrow = { width: 390, height: 700 };

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
  // A run that checked nothing would also have no violations.
  expect(results.passes.length).toBeGreaterThan(5);
}

test("the home page redirects to products", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
  await expect(page).toHaveTitle("Products · Counthouse");
});

test("the shell has its landmarks and marks the current page", async ({ page }) => {
  await page.goto("/products");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Products" })).toHaveAttribute("aria-current", "page");
  // The drawer button is for narrow screens only.
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeHidden();
});

test("the skip link is the first focusable element and moves focus to main", async ({ page }) => {
  await page.goto("/products");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test("library components get their styles, the font and the brand", async ({ page }) => {
      await page.goto("/products");
      const heading = page.getByRole("heading", { level: 1 });

      // The 20px heading size exists only in the library's classes, so it shows that Tailwind
      // scanned the package (the @source line).
      await expect(heading).toHaveCSS("font-size", "20px");
      await expect(heading).toHaveCSS("font-family", /^Inter/);
      const current = page.getByRole("link", { name: "Products" });
      await expect(current).toHaveCSS("border-left-color", brandColor[scheme]);
    });

    test("wide layout has no WCAG A or AA violations", async ({ page }) => {
      await page.goto("/products");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test.describe("narrow layout", () => {
      test.use({ viewport: narrow });

      test("has no WCAG A or AA violations, with the drawer closed and open", async ({ page }) => {
        await page.goto("/products");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoAxeViolations(page);

        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await expect(page.getByRole("link", { name: "Products" })).toBeVisible();
        await expectNoAxeViolations(page);
      });
    });
  });
}

test.describe("narrow layout", () => {
  test.use({ viewport: narrow });

  test("does not scroll sideways", async ({ page }) => {
    await page.goto("/products");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBe(0);
  });

  test("the drawer closes with Esc, an outside click, its button and a link", async ({ page }) => {
    await page.goto("/products");
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    const link = page.getByRole("link", { name: "Products" });
    await expect(link).toBeHidden();

    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(link).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(link).toBeHidden();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();

    await menu.click();
    await expect(link).toBeVisible();
    // The drawer is narrower than the screen, so the right edge is on the dimmed page beside it.
    await page.mouse.click(narrow.width - 5, narrow.height / 2);
    await expect(link).toBeHidden();

    await menu.click();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(link).toBeHidden();

    await menu.click();
    await link.click();
    await expect(link).toBeHidden();
    await expect(page).toHaveURL(/\/products$/);
  });
});
