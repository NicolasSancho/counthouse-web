import { describe, expect, it } from "vitest";

import { createApiClient } from "@/server/api/client";
import type { ProductStatus } from "@/server/api/schema";
import { contractChecks } from "@/server/mock/contract-checks";
import { tenants, users } from "@/server/mock/demo-data";
import { products } from "@/server/mock/demo-products";
import { issue } from "@/server/mock/tokens";

// Through the real typed client, with every response checked against the contract, as in
// `auth-handlers.test.ts`.
const api = createApiClient({ mode: "mock" }, { mockLatencyMs: 0 });
api.use(contractChecks());

const tokenOf = (email: string) => {
  const user = users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`No demo user ${email}`);
  return issue("access", user.id);
};
const ana = tokenOf("ana@counthouse.example");
const marta = tokenOf("marta@counthouse.example");

type Query = {
  page?: number;
  size?: number;
  sort?: string;
  q?: string;
  status?: ProductStatus;
};

const list = (query: Query, token = ana) =>
  api.GET("/products", {
    headers: { Authorization: `Bearer ${token}` },
    params: { query },
  });

async function names(query: Query) {
  const { data } = await list(query);
  return data?.items.map(({ name }) => name) ?? [];
}

describe("GET /products", () => {
  it("answers only with the signed-in user's tenant", async () => {
    const acme = tenants.find(({ slug }) => slug === "acme");
    const own = products.filter(({ tenantId }) => tenantId === acme?.id);
    const { data } = await list({ size: 100 }, marta);

    const ids = own.map(({ detail }) => detail.id);
    expect(data?.items.length).toBeGreaterThan(0);
    expect(data?.items.every(({ id }) => ids.includes(id))).toBe(true);
  });

  it("leaves archived products out unless asked for", async () => {
    const { data: all } = await list({ size: 100 });
    const { data: archived } = await list({ size: 100, status: "ARCHIVED" });

    expect(all?.items.some(({ status }) => status === "ARCHIVED")).toBe(false);
    expect(archived?.items.length).toBeGreaterThan(0);
    expect(archived?.items.every(({ status }) => status === "ARCHIVED")).toBe(true);
  });

  it("matches any part of a name or a SKU, in any case", async () => {
    expect(await names({ q: "RUNNER" })).toContain("Trail Runner");
    expect(await names({ q: "tr0-blk-41" })).toEqual(["Trail Runner"]);
  });

  it("pages with a zero-based index and reports the totals", async () => {
    const { data: first } = await list({ size: 20 });
    const { data: last } = await list({ size: 20, page: 1 });

    expect(first).toMatchObject({ page: 0, size: 20, totalPages: 2 });
    expect(first?.items).toHaveLength(20);
    expect(last?.items.length).toBe((first?.totalItems ?? 0) - 20);
  });

  it("sorts by the requested field and defaults to the newest first", async () => {
    const byName = await names({ sort: "name,asc", size: 100 });
    expect(byName).toEqual(byName.toSorted((a, b) => a.localeCompare(b)));

    const { data } = await list({ size: 100 });
    const created = data?.items.map(({ createdAt }) => createdAt) ?? [];
    expect(created).toEqual(created.toSorted().reverse());
  });

  it.each([
    { case: "a sort the API does not allow", query: { sort: "totalStock,asc" }, field: "sort" },
    { case: "a search that is too long", query: { q: "x".repeat(101) }, field: "q" },
    { case: "a page size above the limit", query: { size: 101 }, field: "size" },
  ])("answers 400 for $case", async ({ query, field }) => {
    const { response, error } = await list(query);

    expect(response.status).toBe(400);
    expect(error?.errors?.map((entry) => entry.field)).toEqual([field]);
  });

  it("answers 401 without a valid token", async () => {
    const { response, error } = await list({}, "nonsense");

    expect(response.status).toBe(401);
    expect(error).toMatchObject({ code: "TOKEN_INVALID" });
  });
});

const getProduct = (id: string, token = ana) =>
  api.GET("/products/{id}", {
    headers: { Authorization: `Bearer ${token}` },
    params: { path: { id } },
  });

describe("GET /products/{id}", () => {
  it("answers every demo product to its own tenant, as the contract describes it", async () => {
    const tokens = { northwind: ana, acme: marta };
    for (const product of products) {
      const slug = tenants.find(({ id }) => id === product.tenantId)?.slug;
      const token = slug === "acme" ? tokens.acme : tokens.northwind;
      const { data, response } = await getProduct(product.detail.id, token);

      expect(response.status).toBe(200);
      expect(data).toEqual(product.detail);
    }
  });

  it("compares ids without regard to case, as UUIDs are", async () => {
    const id = products[0]?.detail.id ?? "";
    const { response } = await getProduct(id.toUpperCase());

    expect(response.status).toBe(200);
  });

  it("answers 404 for another tenant's product and for an unknown id", async () => {
    const acme = tenants.find(({ slug }) => slug === "acme");
    const other = products.find(({ tenantId }) => tenantId === acme?.id);
    if (!other) throw new Error("No Acme product");

    for (const id of [other.detail.id, "00000000-0000-4000-8000-000000000000"]) {
      const { response, error } = await getProduct(id);
      expect(response.status).toBe(404);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    }
  });

  it("answers 401 without a valid token", async () => {
    const id = products[0]?.detail.id ?? "";
    const { response } = await getProduct(id, "nonsense");

    expect(response.status).toBe(401);
  });
});
