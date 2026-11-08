import "server-only";

import { connection } from "next/server";

import { PAGE_SIZE, type ProductQuery } from "@/features/products/product-query";
import { getApiClient } from "@/server/api/client";
import { readApi, type ApiRead } from "@/server/api/read";
import type { ProductPage } from "@/server/api/schema";
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
