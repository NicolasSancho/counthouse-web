import { defineConfig, devices } from "@playwright/test";

import { API_DOWN_PORT } from "./e2e/session";

// A port that is not the dev server's, so a running `npm run dev` never gets tested by mistake.
const port = 3200;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // No retries: a flaky test should fail the run and get fixed, not pass on a second try.
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // A fixed reader locale, so prices and dates do not depend on the machine's language. Playwright
  // sends it as the browser's `Accept-Language`, which the app formats with.
  use: { baseURL, locale: "en-GB", trace: "retain-on-failure" },
  projects: [
    // Signs in once and saves the cookies for the tests that need a session (e2e/session.ts).
    { name: "setup", testMatch: "**/*.setup.ts", use: { ...devices["Desktop Chrome"] } },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
  ],
  // Tests run against the production build (`npm run build` first), the same code that ships.
  webServer: [
    {
      command: `npm run start -- --port ${port}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    // The same build in live mode against a closed port, so every API call fails as it does with
    // the API down. The sign-in page was prerendered in mock mode, so it still shows the demo.
    {
      command: `npm run start -- --port ${API_DOWN_PORT}`,
      url: `http://localhost:${API_DOWN_PORT}/login`,
      // Nothing listens on port 3209, so the connection is refused. (Node's `fetch` refuses well-known
      // ports such as 9 before connecting.)
      env: { API_MODE: "live", API_BASE_URL: "http://127.0.0.1:3209/api/v1" },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
