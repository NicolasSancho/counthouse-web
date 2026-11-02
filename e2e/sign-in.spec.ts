import { expect, test, type Page } from "@playwright/test";

import { expectNoAxeViolations } from "./axe";
import {
  ACCESS_COOKIE,
  apiDownURL,
  REFRESH_COOKIE,
  sessionCookies,
  signedInState,
} from "./session";

const ANA = "ana@counthouse.example";

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

  test("a refresh cookie without an access cookie lands on the expired notice", async ({
    page,
  }) => {
    await page.context().addCookies([cookie(REFRESH_COOKIE, "any")]);
    const response = await page.goto("/products");
    expect(response?.request().redirectedFrom()).not.toBeNull();
    await expect(page).toHaveURL(/\/login\/expired$/);
    await expect(page.getByText("Your session expired. Sign in again.")).toBeVisible();
  });

  // On a page load the server sends this redirect itself (a meta refresh in the streamed page),
  // so this does not exercise the user error boundary.
  test("a token the API refuses lands on the expired notice", async ({ page }) => {
    await page
      .context()
      .addCookies([cookie(ACCESS_COOKIE, "not-a-token"), cookie(REFRESH_COOKIE, "any")]);
    await page.goto("/products");
    await expect(page).toHaveURL(/\/login\/expired$/);
    await expect(page.getByText("Your session expired. Sign in again.")).toBeVisible();
  });
});

test.describe("demo sign-in", () => {
  test("enters as Ana, and Back does not return to the form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Enter the demo" }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("banner")).toContainText("Ana Torres · Admin");

    await page.goBack();
    await expect(page).not.toHaveURL(/\/login/);
  });

  for (const name of ["Iris Chen", "Marta Silva", "Omar Reyes"]) {
    test(`"Use" signs in as ${name}`, async ({ page }) => {
      await page.goto("/login");
      await page.getByText("Other demo accounts").click();
      await page.getByRole("button", { name: `Use ${name}` }).click();
      await expect(page).toHaveURL(/\/products$/);
      await expect(page.getByRole("banner")).toContainText(name);
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

test("a failed demo sign-in shows the error page", async ({ page }) => {
  // The page was built in mock mode, so it shows the demo on the live server too. The action
  // refuses there (src/features/auth/actions.test.ts covers the refusal itself).
  await page.goto(`${apiDownURL}/login`);
  await page.getByRole("button", { name: "Enter the demo" }).click();
  await expect(page.getByText("Something went wrong.")).toBeVisible();
  expect(await sessionCookies(page)).toEqual([]);
});

test.describe("signed in", () => {
  test.use({ storageState: signedInState });

  test("sign out clears both cookies and leaves nothing of the user in the page", async ({
    page,
  }) => {
    await page.goto("/products");
    await expect(page.getByRole("banner")).toContainText("Ana Torres");
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
    await expect(page.getByRole("banner")).toContainText("Ana Torres");
    await page.context().clearCookies({ name: ACCESS_COOKIE });

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await sessionCookies(page)).toEqual([]);
  });

  test("a failure to load the user leaves the page usable", async ({ page }) => {
    // The saved session is for localhost, so it reaches the server whose API is down too.
    await page.goto(`${apiDownURL}/products`);
    const banner = page.getByRole("banner");
    await expect(banner).toContainText("Could not load your account.");
    await expect(banner.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Products" })).toBeVisible();
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
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await sessionCookies(page)).toEqual([]);
  });

  test("a wrong password shows the message and keeps the email", async ({ page }) => {
    await page.goto("/login");
    await signInWith(page, ANA, "wrong");
    await expect(page.getByText("Email or password is wrong.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(ANA);
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
