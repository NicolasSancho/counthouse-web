import { afterEach, describe, expect, it, vi } from "vitest";

import { signInAsDemo } from "@/features/auth/actions";

const demoForm = () => {
  const form = new FormData();
  form.set("email", "ana@counthouse.example");
  return form;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

// An action is a public endpoint, so the demo sign-in checks the mode itself instead of trusting the
// page that showed the button. It refuses before any API call or cookie access.
describe("signInAsDemo", () => {
  it("refuses in live mode", async () => {
    vi.stubEnv("API_MODE", "live");
    await expect(signInAsDemo(demoForm())).rejects.toThrow(
      "Demo accounts exist only in mock mode."
    );
  });

  it("refuses an email that is not a demo account", async () => {
    const form = new FormData();
    form.set("email", "someone@company.example");
    await expect(signInAsDemo(form)).rejects.toThrow("Unknown demo account.");
  });
});
