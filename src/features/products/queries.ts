import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import { PAGE_SIZE, type ProductQuery } from "@/features/products/product-query";
import { getApiClient } from "@/server/api/client";
import { readApi, type ApiRead } from "@/server/api/read";
import type { ProductDetail, ProductPage } from "@/server/api/schema";
import { authorization, requireAccessToken } from "@/server/auth";

/** One page of the tenant's products. Reads are not cached (ADR 0008). */
export async function listProducts(query: ProductQuery): Promise<ApiRead<ProductPage>> {
  const token = await requireAccessToken();
  // Stops a runtime prefetch here. Next.js rejects a fetch still open when a prefetch ends, and
  // the failure handling would report that as an API failure.
  await connection();

  return readApi("GET /products", () =>
    getApiClient().GET("/products", {
      headers: authorization(token),
      params: {
        query: {
          page: query.page - 1,
          size: PAGE_SIZE,
          sort: query.sort,
          q: query.q || undefined,
          status: query.status,
        },
      },
    })
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * A product id as the API compares it: lowercase, or `undefined` when it is not a UUID. A page and
 * its metadata can receive the same segment decoded differently, so this decodes once more where it
 * safely can, and both end up with one value.
 */
export function normalizeProductId(segment: string): string | undefined {
  let id = segment;
  try {
    id = decodeURIComponent(segment);
  } catch {
    // A lone `%` is not an id either; the check below says so.
  }
  id = id.toLowerCase();
  return UUID.test(id) ? id : undefined;
}

/**
 * One product with its variants, for an id already normalized. Cached per request, so the page
 * and its metadata share one call. Not cached across requests (ADR 0008).
 */
const readProduct = cache(async (id: string): Promise<ApiRead<ProductDetail>> => {
  const token = await requireAccessToken();
  // Stops a runtime prefetch here, as in `listProducts()`.
  await connection();

  return readApi(`GET /products/${id}`, () =>
    getApiClient().GET("/products/{id}", {
      headers: authorization(token),
      params: { path: { id } },
    })
  );
});

/**
 * One product, from the URL segment. A segment that is not a UUID is not found without an API
 * call: the contract lists no 400 for it.
 */
export async function getProduct(segment: string): Promise<ApiRead<ProductDetail>> {
  const id = normalizeProductId(segment);
  return id ? readProduct(id) : { ok: false, reason: "not-found" };
}
