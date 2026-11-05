import { beforeEach, describe, expect, it, vi } from "vitest";

import { getApiClient } from "@/server/api/client";
import { refreshAccessToken } from "@/server/refresh";

vi.mock("@/server/api/client", () => ({ getApiClient: vi.fn() }));

const post = vi.fn();
const answered = (status: number) => ({ response: new Response(null, { status }) });

beforeEach(() => {
  post.mockReset();
  vi.mocked(getApiClient).mockReturnValue({ POST: post } as unknown as ReturnType<
    typeof getApiClient
  >);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("refreshAccessToken", () => {
  it("returns the new token, and waits 3 seconds at most", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    post.mockResolvedValueOnce({
      data: { accessToken: "new-access", tokenType: "Bearer", expiresIn: 900 },
      ...answered(200),
    });

    await expect(refreshAccessToken("refresh")).resolves.toEqual({
      outcome: "refreshed",
      accessToken: "new-access",
      expiresIn: 900,
    });
    expect(post).toHaveBeenCalledWith("/auth/refresh", {
      body: { refreshToken: "refresh" },
      signal: expect.any(AbortSignal) as AbortSignal,
    });
    expect(timeout).toHaveBeenCalledWith(3000);
  });

  it.each([
    ["a 400", "refused", () => post.mockResolvedValueOnce(answered(400))],
    ["a 401", "refused", () => post.mockResolvedValueOnce(answered(401))],
    ["a 500", "unavailable", () => post.mockResolvedValueOnce(answered(500))],
    ["a failed request", "unavailable", () => post.mockRejectedValueOnce(new Error("down"))],
  ])("treats %s as %s", async (_, outcome, answer) => {
    answer();

    await expect(refreshAccessToken("refresh")).resolves.toEqual({ outcome });
  });
});
