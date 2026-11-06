import type { ProductQuery } from "@/features/products/product-query";

export type EmptyKind = "past-the-end" | "no-results" | "no-products";

/** Why a list came back empty. A page past the end comes first: it can happen with any filter. */
export function emptyKind({ q, status, page }: ProductQuery): EmptyKind {
  if (page > 1) return "past-the-end";
  return q || status ? "no-results" : "no-products";
}
