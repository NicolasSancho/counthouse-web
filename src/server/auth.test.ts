import { after } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiClient } from "@/server/api/client";
import { signIn, signOut } from "@/server/auth";
import { clearSession, readRefreshToken, writeSession } from "@/server/session";

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/server/api/client", () => ({ getApiClient: vi.fn() }));
vi.mock("@/server/session", () => ({
  clearSession: vi.fn(),
  readAccessToken: vi.fn(),
  readRefreshToken: vi.fn(),
  writeSession: vi.fn(),
}));

const tokens = {
  accessToken: "new-access",
  refreshToken: "new-refresh",
  tokenType: "Bearer",
  expiresIn: 900,
  refreshExpiresIn: 604_800,
};

const post = vi.fn();

/** The cookie as the session module would hold it: writing the session replaces it. */
let refreshCookie: string | undefined;

/** Runs the callbacks passed to `after()`, as Next.js does once the response is sent. */
const runAfter = () =>
  Promise.all(vi.mocked(after).mock.calls.map(([task]) => (task as () => Promise<void>)()));

const logoutCalls = () => post.mock.calls.filter(([path]) => path === "/auth/logout");

beforeEach(() => {
  vi.clearAllMocks();
  post.mockReset();
  refreshCookie = undefined;
  vi.mocked(getApiClient).mockReturnValue({ POST: post } as unknown as ReturnType<
    typeof getApiClient
  >);
  vi.mocked(readRefreshToken).mockImplementation(() => Promise.resolve(refreshCookie));
  vi.mocked(writeSession).mockImplementation(({ refreshToken }) => {
    refreshCookie = refreshToken;
    return Promise.resolve();
  });
  post.mockImplementation((path: string) =>
    Promise.resolve(
      path === "/auth/login"
        ? { data: tokens, response: new Response(null, { status: 200 }) }
        : { response: new Response(null, { status: 204 }) }
    )
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signIn", () => {
  it("revokes the refresh token it replaces, after the response", async () => {
    refreshCookie = "old-refresh";

    await expect(signIn("ana@counthouse.example", "demo-password")).resolves.toEqual({ ok: true });
    expect(logoutCalls()).toEqual([]);

    await runAfter();
    expect(logoutCalls()).toEqual([["/auth/logout", { body: { refreshToken: "old-refresh" } }]]);
  });

  it("does not revoke a token the API hands out again", async () => {
    refreshCookie = tokens.refreshToken;

    await signIn("ana@counthouse.example", "demo-password");

    expect(after).not.toHaveBeenCalled();
  });

  it("revokes nothing on a first sign-in", async () => {
    await signIn("ana@counthouse.example", "demo-password");

    expect(after).not.toHaveBeenCalled();
  });

  it("leaves the session alone when the sign-in fails", async () => {
    refreshCookie = "old-refresh";
    post.mockResolvedValueOnce({
      error: {
        type: "about:blank",
        title: "Invalid credentials",
        status: 401,
        code: "INVALID_CREDENTIALS",
        traceId: "trace",
      },
      response: new Response(null, { status: 401 }),
    });

    await expect(signIn("ana@counthouse.example", "wrong")).resolves.toEqual({
      ok: false,
      reason: "credentials",
    });
    expect(after).not.toHaveBeenCalled();
    expect(writeSession).not.toHaveBeenCalled();
  });

  it("logs a failed revocation instead of throwing", async () => {
    refreshCookie = "old-refresh";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await signIn("ana@counthouse.example", "demo-password");
    post.mockRejectedValueOnce(new Error("API down"));

    await expect(runAfter()).resolves.toBeDefined();
    expect(log).toHaveBeenCalledWith("Revoking the token failed.", expect.any(Error));
  });

  it("logs a refused revocation", async () => {
    refreshCookie = "old-refresh";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await signIn("ana@counthouse.example", "demo-password");
    post.mockResolvedValueOnce({ response: new Response(null, { status: 500 }) });
    await runAfter();

    expect(log).toHaveBeenCalledWith("Revoking the token answered 500.", undefined);
  });
});

describe("signOut", () => {
  it("waits for the revocation before it clears the cookies", async () => {
    refreshCookie = "old-refresh";
    const steps: string[] = [];
    post.mockImplementationOnce(async () => {
      await Promise.resolve();
      steps.push("revoked");
      return { response: new Response(null, { status: 204 }) };
    });
    vi.mocked(clearSession).mockImplementationOnce(() => {
      steps.push("cleared");
      return Promise.resolve();
    });

    await signOut();

    expect(logoutCalls()).toEqual([["/auth/logout", { body: { refreshToken: "old-refresh" } }]]);
    expect(steps).toEqual(["revoked", "cleared"]);
  });

  it("clears the cookies when the revocation fails", async () => {
    refreshCookie = "old-refresh";
    vi.spyOn(console, "error").mockImplementation(() => {});
    post.mockRejectedValueOnce(new Error("API down"));

    await signOut();

    expect(clearSession).toHaveBeenCalledOnce();
  });
});
