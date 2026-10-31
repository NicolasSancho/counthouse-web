import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The default brand in src/app/globals.css, as the browser reports it.
const brandColor = { light: "rgb(107, 76, 174)", dark: "rgb(159, 130, 233)" };

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test("home page has no WCAG A or AA violations", async ({ page }) => {
      await page.goto("/");
      // Wait for the page's own content first, so axe never audits an empty shell.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
      // A run that checked nothing would also have no violations.
      expect(results.passes.length).toBeGreaterThan(5);
    });

    test("library components get their styles, the font and the brand", async ({ page }) => {
      await page.goto("/");
      const heading = page.getByRole("heading", { level: 1 });

      // The 32px heading size exists only in the library's classes, so it shows that Tailwind
      // scanned the package (the @source line).
      await expect(heading).toHaveCSS("font-size", "32px");
      await expect(heading).toHaveCSS("font-family", /^Inter/);
      await expect(page.getByText("Back office")).toHaveCSS("color", brandColor[scheme]);
    });
  });
}
