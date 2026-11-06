import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";

import { PAGE_SIZE, type ProductQuery } from "@/features/products/product-query";
import { getApiClient } from "@/server/api/client";
import { readTraceId, toProblem } from "@/server/api/problem";
import type { ProductPage } from "@/server/api/schema";
import { authorization, requireAccessToken } from "@/server/auth";

export type ProductListResult = { ok: true; page: ProductPage } | { ok: false; traceId?: string };

/**
 * One page of the tenant's products. A failed call is an expected state of this screen, so it comes
 * back as a value: an error thrown in a Server Component reaches the browser without its details,
 * which would lose the trace id. Reads are not cached (ADR 0008).
 */
export async function listProducts(query: ProductQuery): Promise<ProductListResult> {
  const token = await requireAccessToken();
  // Stops a runtime prefetch here. Next.js rejects a fetch still open when a prefetch ends, and the
  // catch below would report that as an API failure.
  await connection();

  let result;
  try {
    result = await getApiClient().GET("/products", {
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
    });
  } catch (cause) {
    console.error("Listing products failed.", cause);
    return { ok: false };
  }

  const { data, error, response } = result;
  if (data) return { ok: true, page: data };
  if (response.status === 401) redirect("/login/expired");

  const problem = toProblem(error);
  console.error(`GET /products answered ${response.status}.`, problem ?? error);
  return { ok: false, traceId: problem?.traceId ?? readTraceId(error) };
}
