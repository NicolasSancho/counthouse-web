import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProducts } from "@/features/products/queries";
import { getApiClient } from "@/server/api/client";

// How each answer becomes a result is `readApi`'s job, tested in `src/server/api/read.test.ts`.
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/server/api/client", () => ({ getApiClient: vi.fn() }));
vi.mock("@/server/auth", () => ({
  authorization: (token: string) => ({ Authorization: `Bearer ${token}` }),
  requireAccessToken: () => Promise.resolve("token"),
}));

const get = vi.fn();
const ok = (data: unknown) => ({ data, response: new Response() });

beforeEach(() => {
  get.mockReset();
  vi.mocked(getApiClient).mockReturnValue({ GET: get } as unknown as ReturnType<
    typeof getApiClient
  >);
});

describe("listProducts", () => {
  it("sends the token and converts the page to the API's zero-based index", async () => {
    const page = { items: [], page: 1, size: 20, totalItems: 0, totalPages: 0 };
    get.mockResolvedValue(ok(page));

    await expect(listProducts({ q: "", page: 2 })).resolves.toEqual({ ok: true, value: page });
    expect(get).toHaveBeenCalledWith("/products", {
      headers: { Authorization: "Bearer token" },
      params: { query: expect.objectContaining({ page: 1, size: 20, q: undefined }) as object },
    });
  });
});
