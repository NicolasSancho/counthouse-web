import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProducts } from "@/features/products/queries";
import { getApiClient } from "@/server/api/client";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/server/api/client", () => ({ getApiClient: vi.fn() }));
vi.mock("@/server/auth", () => ({
  authorization: (token: string) => ({ Authorization: `Bearer ${token}` }),
  requireAccessToken: () => Promise.resolve("token"),
}));

const get = vi.fn();
const query = { q: "", page: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  get.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.mocked(getApiClient).mockReturnValue({ GET: get } as unknown as ReturnType<
    typeof getApiClient
  >);
});

describe("listProducts", () => {
  it("sends the token and converts the page to the API's zero-based index", async () => {
    const page = { items: [], page: 1, size: 20, totalItems: 0, totalPages: 0 };
    get.mockResolvedValue({ data: page, response: new Response() });

    await expect(listProducts(query)).resolves.toEqual({ ok: true, page });
    expect(get).toHaveBeenCalledWith("/products", {
      headers: { Authorization: "Bearer token" },
      params: { query: expect.objectContaining({ page: 1, size: 20, q: undefined }) as object },
    });
  });

  it("ends the session on a 401", async () => {
    get.mockResolvedValue({ error: {}, response: new Response(null, { status: 401 }) });

    await expect(listProducts(query)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login/expired");
  });

  it("returns the trace id of a failed call", async () => {
    get.mockResolvedValue({
      error: { traceId: "abc" },
      response: new Response(null, { status: 500 }),
    });

    await expect(listProducts(query)).resolves.toEqual({ ok: false, traceId: "abc" });
  });

  it("returns a failure when the API cannot be reached", async () => {
    get.mockRejectedValue(new TypeError("fetch failed"));

    await expect(listProducts(query)).resolves.toEqual({ ok: false });
  });
});
