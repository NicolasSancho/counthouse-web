import { expect, test, type Page, type Route } from "@playwright/test";

import { signedInState } from "./session";

interface List {
  q: string;
  status: string;
  sort: string;
  page: number;
}

/** A user action, and what it asks for. Back has no model: it goes where the history says. */
interface Action {
  run: (page: Page) => Promise<unknown>;
  model?: (list: List) => List;
}

const search = (page: Page) => page.getByRole("searchbox", { name: /search products/i });
const statusFilter = (page: Page) => page.getByRole("combobox", { name: "Status" });

const ACTIONS: Record<string, Action> = {
  type: {
    run: (page) => search(page).pressSequentially("r"),
    model: (list) => ({ ...list, q: `${list.q}r` }),
  },
  enter: {
    run: async (page) => {
      await search(page).pressSequentially("o");
      await search(page).press("Enter");
    },
    model: (list) => ({ ...list, q: `${list.q}o` }),
  },
  sort: {
    run: (page) => page.getByRole("link", { name: "Price" }).click(),
    model: (list) => ({ ...list, sort: "basePriceCents,asc" }),
  },
  // Both Next links on screen point at page 2 until an answer arrives, so twice is still page 2.
  next: {
    run: (page) => page.getByRole("link", { name: /next/i }).click(),
    model: (list) => ({ ...list, page: 2 }),
  },
  status: {
    run: (page) => statusFilter(page).selectOption("ACTIVE"),
    model: (list) => ({ ...list, status: "ACTIVE" }),
  },
  back: { run: (page) => page.goBack({ waitUntil: "commit" }) },
};

/** Long enough for a typed search to go out. */
const PAST_THE_DEBOUNCE_MS = 450;

/** Holds every navigation's answer until `release`, so both actions happen before any arrives. */
async function holdNavigations(page: Page) {
  const held: Route[] = [];
  let holding = true;
  await page.route("**/products*", async (route) => {
    if (holding && route.request().headers().rsc) held.push(route);
    else await route.continue();
  });
  return async () => {
    holding = false;
    await Promise.all(held.map((route) => route.continue()));
  };
}

function expected(first: Action, second: Action): List | undefined {
  if (!first.model || !second.model) return undefined;
  const start = { q: "", status: "", sort: "name,asc", page: 1 };
  const list = second.model(first.model(start));
  const sameFilters = !list.q && !list.status && list.sort === start.sort;
  return sameFilters ? list : { ...list, page: 1 };
}

function urlList(page: Page): List {
  const { searchParams } = new URL(page.url());
  return {
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? "",
    sort: searchParams.get("sort") ?? "",
    page: Number(searchParams.get("page") ?? 1),
  };
}

test.use({ storageState: signedInState });

for (const [firstName, first] of Object.entries(ACTIONS)) {
  // No answer arrives between the actions, so the gap matters only if the debounce fires in it.
  const gaps = firstName === "type" ? [30, PAST_THE_DEBOUNCE_MS] : [30];
  for (const [secondName, second] of Object.entries(ACTIONS)) {
    for (const gap of gaps) {
      test(`${firstName} then ${secondName}, ${gap} ms apart`, async ({ page }) => {
        const errors: Error[] = [];
        page.on("pageerror", (error) => errors.push(error));

        // Two sorts first, so Back twice stays in the list.
        await page.goto("/products");
        await page.getByRole("link", { name: "Price" }).click();
        await page.waitForURL(/sort=basePriceCents/);
        await page.getByRole("link", { name: "Name" }).click();
        await page.waitForURL(/sort=name/);
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

        const release = await holdNavigations(page);
        await first.run(page);
        await page.waitForTimeout(gap);
        await second.run(page);
        await page.waitForTimeout(PAST_THE_DEBOUNCE_MS);
        await release();

        await expect(async () => {
          const list = urlList(page);
          const want = expected(first, second);
          if (want) expect(list).toEqual(want);

          await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
          expect(await search(page).inputValue()).toBe(list.q);
          expect(await statusFilter(page).inputValue()).toBe(list.status);
          expect(await page.locator("th[aria-sort]").count()).toBeLessThanOrEqual(1);

          const announced = await page.getByRole("status").allTextContents();
          expect(announced).toHaveLength(1);
          if (announced[0]?.startsWith("Showing")) {
            expect(announced[0]).toContain(`Showing ${(list.page - 1) * 20 + 1} to`);
          }
          expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
        }).toPass({ timeout: 5_000 });

        expect(errors).toEqual([]);
      });
    }
  }
}
