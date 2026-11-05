import { expect, test } from "@playwright/test";

const POLICY = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'";

const PATHS = [
  { path: "/login", status: 200, kind: "a static page" },
  { path: "/products", status: 307, kind: "a proxy redirect" },
  { path: "/favicon.ico", status: 200, kind: "a path the proxy skips" },
  { path: "/nope.png", status: 404, kind: "a missing file" },
];

for (const { path, status, kind } of PATHS) {
  test(`${kind} sends the security policy`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });

    expect(response.status()).toBe(status);
    expect(response.headers()["content-security-policy"]).toBe(POLICY);
  });
}

test("the browser refuses to show the app inside a frame", async ({ page, baseURL }) => {
  const signIn = { name: "Sign in", exact: true };
  await page.goto("/login");
  await expect(page.getByRole("button", signIn)).toBeVisible();

  await page.setContent(`<iframe title="app" src="${baseURL}/login"></iframe>`);

  await expect(page.frameLocator("iframe").getByRole("button", signIn)).toHaveCount(0);
});
