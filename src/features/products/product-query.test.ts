import { describe, expect, it } from "vitest";

import {
  changedFields,
  MAX_SEARCH_LENGTH,
  nextSort,
  parseProductQuery,
  productHref,
  productsHref,
  sortDirection,
} from "@/features/products/product-query";

describe("parseProductQuery", () => {
  it("reads a full query", () => {
    expect(parseProductQuery({ q: "boot", status: "DRAFT", sort: "name,desc", page: "3" })).toEqual(
      { q: "boot", status: "DRAFT", sort: "name,desc", page: 3 }
    );
  });

  it.each([
    { case: "an unknown status", params: { status: "SOLD" } },
    { case: "a sort the API refuses", params: { sort: "totalStock,asc" } },
    { case: "a page of zero", params: { page: "0" } },
    { case: "a negative page", params: { page: "-1" } },
    { case: "a page that is not a number", params: { page: "2x" } },
    { case: "a page too large to be exact", params: { page: "99999999999999999999" } },
    { case: "a repeated value", params: { q: ["a", "b"], page: ["2", "3"] } },
  ])("falls back to the defaults for $case", ({ params }) => {
    expect(parseProductQuery(params)).toEqual({ q: "", page: 1 });
  });

  it("cuts a search to the contract's limit, which the API enforces with a 400", () => {
    const { q } = parseProductQuery({ q: "x".repeat(MAX_SEARCH_LENGTH + 1) });
    expect(q).toHaveLength(MAX_SEARCH_LENGTH);
  });
});

describe("parseProductQuery with an emoji at the limit", () => {
  it("does not leave half a character, which cannot be encoded in a URL", () => {
    const { q } = parseProductQuery({ q: `${"x".repeat(MAX_SEARCH_LENGTH - 1)}😀` });

    expect(q).toHaveLength(MAX_SEARCH_LENGTH);
    expect(() => encodeURIComponent(q)).not.toThrow();
  });
});

describe("productsHref", () => {
  it("leaves the defaults out", () => {
    expect(productsHref({ q: "", page: 1 })).toBe("/products");
  });

  it("gives back the same query when parsed", () => {
    const query = { q: "a b&c", status: "ARCHIVED", sort: "updatedAt,asc", page: 2 } as const;
    const params = new URL(productsHref(query), "http://localhost").searchParams;
    expect(parseProductQuery(Object.fromEntries(params))).toEqual(query);
  });
});

describe("productHref", () => {
  it("carries the list state, so the way back returns to it", () => {
    const query = { q: "boot", status: "DRAFT", page: 2 } as const;
    const href = productHref("p-1", query);
    const params = new URL(href, "http://localhost").searchParams;

    expect(href.startsWith("/products/p-1?")).toBe(true);
    expect(productsHref(parseProductQuery(Object.fromEntries(params)))).toBe(productsHref(query));
  });

  it("is the plain product URL for the default list", () => {
    expect(productHref("p-1", { q: "", page: 1 })).toBe("/products/p-1");
  });
});

describe("changedFields", () => {
  it("keeps only what differs, including a filter being removed", () => {
    const from = { q: "boot", status: "DRAFT", sort: "name,asc", page: 2 } as const;

    expect(changedFields(from, { ...from, page: 3 })).toEqual({ page: 3 });
    expect(changedFields(from, { ...from, status: undefined })).toEqual({ status: undefined });
    expect(changedFields(from, from)).toEqual({});
  });
});

describe("sorting", () => {
  it("starts ascending and flips on the same column", () => {
    expect(nextSort(undefined, "name")).toBe("name,asc");
    expect(nextSort("name,asc", "name")).toBe("name,desc");
    expect(nextSort("name,desc", "name")).toBe("name,asc");
    expect(nextSort("name,desc", "updatedAt")).toBe("updatedAt,asc");
  });

  it("marks only the sorted column", () => {
    expect(sortDirection("name,desc", "name")).toBe("descending");
    expect(sortDirection("name,desc", "updatedAt")).toBeUndefined();
  });
});
