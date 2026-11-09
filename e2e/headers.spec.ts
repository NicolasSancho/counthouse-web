import { expect, test } from "@playwright/test";

const BASE_POLICY = "object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
const PAGE_POLICY =
  /^script-src 'self' 'nonce-([A-Za-z0-9+/]+=*)' 'strict-dynamic'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'$/;

const PATHS = [
  { path: "/login", status: 200, kind: "a page", policy: PAGE_POLICY },
  { path: "/products", status: 307, kind: "a proxy redirect", policy: PAGE_POLICY },
  { path: "/favicon.ico", status: 200, kind: "a path the proxy skips", policy: BASE_POLICY },
  { path: "/nope.png", status: 404, kind: "a missing file", policy: BASE_POLICY },
];

for (const { path, status, kind, policy } of PATHS) {
  test(`${kind} sends its security policy`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });

    expect(response.status()).toBe(status);
    const header = response.headers()["content-security-policy"];
    if (typeof policy === "string") expect(header).toBe(policy);
    else expect(header).toMatch(policy);
  });
}

test("every response gets a new nonce", async ({ request }) => {
  const nonce = async () => {
    const response = await request.get("/login");
    return PAGE_POLICY.exec(response.headers()["content-security-policy"] ?? "")?.[1];
  };

  const [first, second] = [await nonce(), await nonce()];
  expect(first).toBeTruthy();
  expect(second).not.toBe(first);
});

test("the browser refuses to show the app inside a frame", async ({ page, baseURL }) => {
  const signIn = { name: "Sign in", exact: true };
  await page.goto("/login");
  await expect(page.getByRole("button", signIn)).toBeVisible();

  await page.setContent(`<iframe title="app" src="${baseURL}/login"></iframe>`);

  await expect(page.frameLocator("iframe").getByRole("button", signIn)).toHaveCount(0);
});
