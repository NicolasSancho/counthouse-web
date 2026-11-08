import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProduct, listProducts, normalizeProductId } from "@/features/products/queries";
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

const ID = "00000000-0000-4000-8000-0b9d00000000";

describe("normalizeProductId", () => {
  it.each([
    { segment: ID, id: ID },
    { segment: ID.toUpperCase(), id: ID },
    { segment: encodeURIComponent(ID.toUpperCase()), id: ID },
  ])("reads $segment as the API's id", ({ segment, id }) => {
    expect(normalizeProductId(segment)).toBe(id);
  });

  it.each(["not-a-uuid", "../products", `${ID}x`, "", "%", "%20", ` ${ID}`])(
    "rejects %j",
    (segment) => {
      expect(normalizeProductId(segment)).toBeUndefined();
    }
  );
});

describe("getProduct", () => {
  it("asks the API for the normalized id", async () => {
    const product = { id: ID, name: "Trail Runner" };
    get.mockResolvedValue(ok(product));

    await expect(getProduct(ID.toUpperCase())).resolves.toEqual({ ok: true, value: product });
    expect(get).toHaveBeenCalledWith("/products/{id}", {
      headers: { Authorization: "Bearer token" },
      params: { path: { id: ID } },
    });
  });

  it("treats a segment that is not a UUID as not found without calling the API", async () => {
    await expect(getProduct("not-a-uuid")).resolves.toEqual({ ok: false, reason: "not-found" });
    expect(get).not.toHaveBeenCalled();
  });
});
