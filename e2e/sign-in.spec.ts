import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations } from "./axe";
import {
  ACCESS_COOKIE,
  apiDownURL,
  boundAccess,
  REFRESH_COOKIE,
  sessionCookies,
  signedInState,
} from "./session";

const ANA = "ana@counthouse.example";
const IRIS = "iris@counthouse.example";

/**
 * The wrapper around the form message: it takes focus, the alert inside it is announced. Next.js
 * adds its own empty `alert` (the route announcer), so tests find the message through this.
 */
const formMessage = (page: Page) => page.locator("div[tabindex='-1']:has([role='alert'])");

async function signInWith(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** A session cookie as the browser keeps it. Cookies ignore the port, so it reaches both servers. */
function cookie(name: string, value: string) {
  return { name, value, domain: "localhost", path: "/", httpOnly: true, secure: true };
}

test.describe("signed out", () => {
  for (const path of ["/", "/products"]) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      const response = await page.goto(path);
      // An HTTP redirect from the proxy, before any page renders.
      expect(response?.request().redirectedFrom()).not.toBeNull();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
      await expect(page).toHaveTitle("Sign in · Counthouse");
    });
  }

  test("a refresh the API refuses clears the session and lands on the expired notice", async ({
    page,
  }) => {
    await page.context().addCookies([cookie(REFRESH_COOKIE, "any")]);
    const response = await page.goto("/products");
    expect(response?.request().redirectedFrom()).not.toBeNull();
    await expect(page).toHaveURL(/\/login\/expired$/);
    await expect(page.getByText("Your session expired. Sign in again.")).toBeVisible();
    expect(await sessionCookies(page)).toEqual([]);
  });

  // On a page load the server sends this redirect itself (a meta refresh in the streamed page),
  // so this does not exercise the user error boundary.
  test("a token the API refuses lands on the expired notice", async ({ page }) => {
    await page
      .context()
      .addCookies([
        cookie(ACCESS_COOKIE, boundAccess("not-a-token", "any")),
        cookie(REFRESH_COOKIE, "any"),
      ]);
    await page.goto("/products");
    await expect(page).toHaveURL(/\/login\/expired$/);
    await expect(page.getByText("Your session expired. Sign in again.")).toBeVisible();
    // Both cookies stay: the API refused the access token, and the refresh was never tried.
    expect(await sessionCookies(page)).toHaveLength(2);
  });

  test("a refused token opened at the sign-in page stops at the expired notice", async ({
    page,
  }) => {
    await page
      .context()
      .addCookies([
        cookie(ACCESS_COOKIE, boundAccess("not-a-token", "any")),
        cookie(REFRESH_COOKIE, "any"),
      ]);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login\/expired$/);
    await expect(page.getByText("Your session expired. Sign in again.")).toBeVisible();
    expect(await sessionCookies(page)).toHaveLength(2);
  });

  test("an access cookie alone shows the sign-in page", async ({ page }) => {
    await page.context().addCookies([cookie(ACCESS_COOKIE, "any")]);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });

  test("a dead refresh cookie at the sign-in page lands on the expired notice", async ({
    page,
  }) => {
    await page.context().addCookies([cookie(REFRESH_COOKIE, "any")]);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login\/expired$/);
    expect(await sessionCookies(page)).toEqual([]);
  });
});

test.describe("token refresh", () => {
  test.use({ storageState: signedInState });

  // Full page loads: a client navigation can be served without reaching the proxy.
  test("an expired access cookie is renewed without leaving the page", async ({ page }) => {
    await page.context().clearCookies({ name: ACCESS_COOKIE });
    const [refreshBefore] = await sessionCookies(page);

    await page.goto("/products");

    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("button", { name: "Ana Torres · Admin" })).toBeVisible();
    const cookies = await sessionCookies(page);
    expect(cookies.find(({ name }) => name === ACCESS_COOKIE)).toBeDefined();
    expect(cookies.find(({ name }) => name === REFRESH_COOKIE)?.value).toBe(refreshBefore?.value);
  });

  test("the API being down keeps the session", async ({ page }) => {
    await page.context().clearCookies({ name: ACCESS_COOKIE });

    await page.goto(`${apiDownURL}/products`);

    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByText("Something went wrong.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Account" })).toBeVisible();
    const cookies = await sessionCookies(page);
    expect(cookies.map(({ name }) => name)).toEqual([REFRESH_COOKIE]);
  });

  test("an access cookie from another session is not used", async ({ page, browser }) => {
    const other = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const otherPage = await other.newPage();
    await otherPage.goto("/login");
    await signInWith(otherPage, IRIS, "demo-password");
    await expect(otherPage).toHaveURL(/\/products$/);
    const irisCookies = await sessionCookies(otherPage);
    await other.close();

    // Ana's access cookie stays, under Iris's refresh token: what a late refresh leaves behind.
    await page.context().addCookies(irisCookies.filter(({ name }) => name === REFRESH_COOKIE));
    await page.goto("/products");

    await expect(page.getByRole("button", { name: "Iris Chen · Operator" })).toBeVisible();
  });
});

test.describe("demo sign-in", () => {
  test("enters as Ana, and Back does not return to the form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Enter the demo" }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("button", { name: "Ana Torres · Admin" })).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/\/login/);
  });

  for (const name of ["Iris Chen", "Marta Silva", "Omar Reyes"]) {
    test(`"Use" signs in as ${name}`, async ({ page }) => {
      await page.goto("/login");
      await page.getByText("Other demo accounts").click();
      await page.getByRole("button", { name: `Use ${name}` }).click();
      await expect(page).toHaveURL(/\/products$/);
      await expect(page.getByRole("button", { name: name })).toBeVisible();
    });
  }
});

test.describe("sign-in errors", () => {
  test("a wrong password shows one focused message and keeps the email", async ({ page }) => {
    await page.goto("/login");
    await signInWith(page, ANA, "wrong");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled();

    await expect(formMessage(page)).toBeFocused();
    await expect(formMessage(page)).toHaveCSS("outline-style", "solid");
    await expect(formMessage(page)).toHaveText(
      "Email or password is wrong. Check them and try again."
    );
    await expect(page.getByLabel("Email")).toHaveValue(ANA);
    await expect(page.getByLabel("Password")).toHaveValue("");

    // The same error again moves focus again.
    await page.getByLabel("Password").fill("wrong again");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(formMessage(page)).toBeFocused();
  });

  test("empty fields get a message each, and focus goes to the first", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();

    const email = page.getByLabel("Email");
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription("Enter your email.");
    await expect(page.getByLabel("Password")).toHaveAccessibleDescription("Enter your password.");
    await expect(formMessage(page)).toHaveCount(0);
  });

  test("a malformed email gets its own message", async ({ page }) => {
    await page.goto("/login");
    await signInWith(page, "ana", "demo-password");
    await expect(page.getByLabel("Email")).toHaveAccessibleDescription(
      "Enter an email address in the right format, like name@company.com."
    );
    await expect(page.getByLabel("Password")).not.toHaveAttribute("aria-invalid");
  });

  test("an unreachable API shows a sign-in failure, and no cookies are set", async ({ page }) => {
    await page.goto(`${apiDownURL}/login`);
    await signInWith(page, ANA, "demo-password");
    await expect(formMessage(page)).toBeFocused();
    await expect(formMessage(page)).toContainText("Sign-in failed. Try again.");
    expect(await sessionCookies(page)).toEqual([]);
  });
});

test("a form left open signs in over the session of another tab", async ({ page, context }) => {
  await page.goto("/login");

  const otherTab = await context.newPage();
  await otherTab.goto("/login");
  await otherTab.getByRole("button", { name: "Enter the demo" }).click();
  await expect(otherTab).toHaveURL(/\/products$/);

  await signInWith(page, IRIS, "demo-password");
  await expect(page).toHaveURL(/\/products$/);
  // The screen alone does not prove it: a reload shows the new cookies reached the browser.
  await page.reload();
  await expect(page.getByRole("button", { name: "Iris Chen" })).toBeVisible();
});

test.describe("signed in", () => {
  test.use({ storageState: signedInState });

  test("the sign-in page redirects to the products page", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.request().redirectedFrom()).not.toBeNull();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("button", { name: "Ana Torres" })).toBeVisible();
  });

  test("sign out clears the session cookies and leaves nothing of the user in the page", async ({
    page,
  }) => {
    await page.goto("/products");
    await page.getByRole("button", { name: /Ana Torres/ }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await sessionCookies(page)).toEqual([]);
    // A client navigation would keep the signed-in screen in the DOM, hidden.
    expect(await page.content()).not.toContain("Ana Torres");
  });

  test("sign-out refuses a request from another origin", async ({ page }) => {
    const response = await page.request.post("/logout", {
      headers: { Origin: "https://attacker.example" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(403);
    expect(await sessionCookies(page)).toHaveLength(2);
  });

  test("sign out also works after the access cookie expired", async ({ page }) => {
    await page.goto("/products");
    const trigger = page.getByRole("button", { name: /Ana Torres/ });
    await expect(trigger).toBeVisible();
    await page.context().clearCookies({ name: ACCESS_COOKIE });

    await trigger.click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await sessionCookies(page)).toEqual([]);
  });

  test("a failure to load the user leaves the page usable", async ({ page }) => {
    // The saved session is for localhost, so it reaches the server whose API is down too.
    await page.goto(`${apiDownURL}/products`);
    await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
    await expect(page.getByText("Northwind Footwear")).toHaveCount(0);

    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByText("Could not load your account.")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await sessionCookies(page)).toEqual([]);
  });

  test("retry reloads the document", async ({ page }) => {
    await page.goto(`${apiDownURL}/products`);
    await page.evaluate(() => document.documentElement.setAttribute("data-before-retry", ""));

    await page.getByRole("button", { name: "Account" }).click();
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.locator("[data-before-retry]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Account" })).toBeVisible();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the demo signs in", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Enter the demo" }).click();
    await expect(page).toHaveURL(/\/products$/);
    expect(await sessionCookies(page)).toHaveLength(2);
  });

  test("sign out works", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Enter the demo" }).click();
    // The name streams in with JavaScript, so the button keeps its fallback.
    await page.getByRole("button", { name: "Account" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await sessionCookies(page)).toEqual([]);
  });

  // A failed attempt brings back the empty form without its message: every page renders per
  // request for the script policy (ADR 0010), and working without JavaScript is not a goal.
  test("a form left open is not redirected once session cookies exist", async ({ page }) => {
    await page.goto("/login");
    await page.context().addCookies([cookie(ACCESS_COOKIE, "any"), cookie(REFRESH_COOKIE, "any")]);
    await signInWith(page, ANA, "wrong");
    // A redirected post would end on /products or /login/expired.
    await expect(page).toHaveURL(/\/login$/);
  });
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test("the sign-in page has no WCAG A or AA violations", async ({ page }) => {
      await page.goto("/login");
      await page.getByText("Other demo accounts").click();
      await expect(page.getByRole("button", { name: "Use Iris Chen" })).toBeVisible();
      await expectNoAxeViolations(page);

      await signInWith(page, ANA, "wrong");
      await expect(formMessage(page)).toBeVisible();
      await expectNoAxeViolations(page);
    });

    test("the expired notice has no WCAG A or AA violations", async ({ page }) => {
      await page.goto("/login/expired");
      await expect(page.getByText("Your session expired.")).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
}
