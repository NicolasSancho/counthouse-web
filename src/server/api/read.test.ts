import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readApi } from "@/server/api/read";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const answer = (status: number, body: { data?: unknown; error?: unknown }) => () =>
  Promise.resolve({ ...body, response: new Response(null, { status }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("readApi", () => {
  it("returns the data of a successful call", async () => {
    await expect(readApi("GET /x", answer(200, { data: { id: 1 } }))).resolves.toEqual({
      ok: true,
      value: { id: 1 },
    });
  });

  it("ends the session on a 401", async () => {
    await expect(readApi("GET /x", answer(401, { error: {} }))).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login/expired");
  });

  it("tells a 404 from other failures", async () => {
    await expect(readApi("GET /x", answer(404, { error: { code: "NOT_FOUND" } }))).resolves.toEqual(
      { ok: false, reason: "not-found" }
    );
  });

  it("returns the trace id of a failed call", async () => {
    await expect(readApi("GET /x", answer(500, { error: { traceId: "abc" } }))).resolves.toEqual({
      ok: false,
      reason: "failed",
      traceId: "abc",
    });
  });

  it("returns a failure when the API cannot be reached", async () => {
    const unreachable = () => Promise.reject(new TypeError("fetch failed"));
    await expect(readApi("GET /x", unreachable)).resolves.toEqual({ ok: false, reason: "failed" });
  });
});
