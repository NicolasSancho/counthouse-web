import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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
  });
}
