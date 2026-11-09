import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "@/proxy";
import { refreshAccessToken } from "@/server/refresh";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/server/session";

vi.mock("@/server/refresh", () => ({ refreshAccessToken: vi.fn() }));

/** The header Next.js uses internally to carry the forwarded `Cookie` to the render. */
const FORWARDED_COOKIES = "x-middleware-request-cookie";

function request(method: string, cookie?: string) {
  const headers = cookie ? { cookie } : undefined;
  return new NextRequest("http://localhost/products", { method, headers });
}

beforeEach(() => {
  vi.mocked(refreshAccessToken).mockReset();
});

describe("a refreshed token", () => {
  it("reaches this render and the browser, on a response that is not cached", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValueOnce({
      outcome: "refreshed",
      accessToken: "new-access",
      expiresIn: 900,
    });

    const response = await proxy(request("GET", `${REFRESH_COOKIE}=refresh`));

    const written = response?.cookies.get(ACCESS_COOKIE)?.value;
    expect(written).toContain("new-access");
    expect(response?.headers.get(FORWARDED_COOKIES)).toContain(`${ACCESS_COOKIE}=${written}`);
    expect(response?.headers.get("cache-control")).toBe("private, no-store");
  });
});

it("redirects a HEAD without a session, like a GET", async () => {
  const response = await proxy(request("HEAD"));

  expect(response?.headers.get("location")).toBe("http://localhost/login");
});

// No page has a signed-in Server Action yet, so these paths cannot be reached from a browser test.
describe("a POST", () => {
  it("passes without a session", async () => {
    const response = await proxy(request("POST"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  it("passes without the refresh cookie when the refresh is refused", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValueOnce({ outcome: "refused" });

    const response = await proxy(request("POST", `${REFRESH_COOKIE}=refresh`));

    expect(response?.headers.get("location")).toBeNull();
    expect(response?.headers.get("set-cookie")).toBeNull();
    expect(response?.headers.get(FORWARDED_COOKIES)).toBe("");
  });
});
