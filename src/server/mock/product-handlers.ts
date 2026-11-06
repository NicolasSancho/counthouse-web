import "server-only";

import { createOpenApiHttp } from "openapi-msw";

import type { FieldError, paths, ProductStatus } from "@/server/api/schema";
import { products, type DemoProduct } from "@/server/mock/demo-products";
import { authenticate, validationFailed } from "@/server/mock/responses";

const SORT = /^(createdAt|updatedAt|name|basePriceCents),(asc|desc)$/;
const STATUSES: readonly string[] = ["DRAFT", "ACTIVE", "ARCHIVED"] satisfies ProductStatus[];
const MAX_QUERY_LENGTH = 100;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

type SortField = "createdAt" | "updatedAt" | "name" | "basePriceCents";

/** `GET /products` of contract 0.3.0: filter, sort and page one tenant's products. */
export function createProductHandlers(baseUrl: string) {
  const http = createOpenApiHttp<paths>({ baseUrl });

  return [
    http.get("/products", ({ request, response }) => {
      const session = authenticate(request);
      if (!session.ok) return response(401).json(...session.problem);

      const params = new URL(request.url).searchParams;
      const errors: FieldError[] = [];
      const page = readInteger(params, "page", 0, 0, Number.MAX_SAFE_INTEGER, errors);
      const size = readInteger(params, "size", DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE, errors);
      const sort = params.get("sort") ?? "createdAt,desc";
      const q = params.get("q")?.toLowerCase() ?? "";
      const status = params.get("status");

      if (!SORT.test(sort)) {
        errors.push({ field: "sort", code: "INVALID_VALUE", message: "is not an allowed sort" });
      }
      if (q.length > MAX_QUERY_LENGTH) {
        errors.push({ field: "q", code: "TOO_LONG", message: "must be 100 characters or fewer" });
      }
      if (status !== null && !STATUSES.includes(status)) {
        errors.push({ field: "status", code: "INVALID_VALUE", message: "is not a status" });
      }
      if (errors.length > 0) return response(400).json(...validationFailed(errors));

      const matches = products
        .filter((product) => product.tenantId === session.me.tenant.id)
        .filter((product) => isListed(product, status))
        .filter((product) => matchesQuery(product, q))
        .toSorted(compareBy(sort));

      return response(200).json({
        items: matches.slice(page * size, (page + 1) * size).map((product) => product.summary),
        page,
        size,
        totalItems: matches.length,
        totalPages: Math.ceil(matches.length / size),
      });
    }),
  ];
}

function readInteger(
  params: URLSearchParams,
  field: string,
  fallback: number,
  min: number,
  max: number,
  errors: FieldError[]
): number {
  const raw = params.get(field);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (Number.isInteger(value) && value >= min && value <= max) return value;
  errors.push({ field, code: "OUT_OF_RANGE", message: `must be from ${min} to ${max}` });
  return fallback;
}

/** Archived products show only when asked for. */
function isListed({ summary }: DemoProduct, status: string | null): boolean {
  return status ? summary.status === status : summary.status !== "ARCHIVED";
}

function matchesQuery(product: DemoProduct, q: string): boolean {
  return (
    product.summary.name.toLowerCase().includes(q) ||
    product.skus.some((sku) => sku.toLowerCase().includes(q))
  );
}

/** Ties break on the id, so a row never moves between pages. */
function compareBy(sort: string) {
  const [field, direction] = sort.split(",") as [SortField, "asc" | "desc"];
  const sign = direction === "asc" ? 1 : -1;
  return (a: DemoProduct, b: DemoProduct) => {
    const left = a.summary[field];
    const right = b.summary[field];
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
    return sign * order || a.summary.id.localeCompare(b.summary.id);
  };
}
