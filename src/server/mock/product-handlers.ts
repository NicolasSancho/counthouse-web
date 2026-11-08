import "server-only";

import { createOpenApiHttp } from "openapi-msw";

import type {
  FieldError,
  paths,
  ProductDetail,
  ProductStatus,
  ProductSummary,
} from "@/server/api/schema";
import { products, toSummary } from "@/server/mock/demo-products";
import { authenticate, problem, validationFailed } from "@/server/mock/responses";

const SORT = /^(createdAt|updatedAt|name|basePriceCents),(asc|desc)$/;
const STATUSES: readonly string[] = ["DRAFT", "ACTIVE", "ARCHIVED"] satisfies ProductStatus[];
const MAX_QUERY_LENGTH = 100;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

type SortField = "createdAt" | "updatedAt" | "name" | "basePriceCents";

/** `GET /products` and `GET /products/{id}` of contract 0.3.0, for one tenant's products. */
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
        .map(({ detail }) => detail)
        .filter((detail) => isListed(detail, status))
        .filter((detail) => matchesQuery(detail, q))
        .map(toSummary)
        .toSorted(compareBy(sort));

      return response(200).json({
        items: matches.slice(page * size, (page + 1) * size),
        page,
        size,
        totalItems: matches.length,
        totalPages: Math.ceil(matches.length / size),
      });
    }),

    // Another tenant's product is answered like a missing one, as the contract says.
    http.get("/products/{id}", ({ request, params, response }) => {
      const session = authenticate(request);
      if (!session.ok) return response(401).json(...session.problem);

      // Ids are compared without regard to case, as UUIDs are.
      const id = params.id.toLowerCase();
      const product = products.find(
        ({ detail, tenantId }) => detail.id === id && tenantId === session.me.tenant.id
      );
      if (!product) return response(404).json(...problem(404, "NOT_FOUND", "Not found"));
      return response(200).json(product.detail);
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
function isListed(detail: ProductDetail, status: string | null): boolean {
  return status ? detail.status === status : detail.status !== "ARCHIVED";
}

function matchesQuery(detail: ProductDetail, q: string): boolean {
  return (
    detail.name.toLowerCase().includes(q) ||
    detail.variants.some(({ sku }) => sku.toLowerCase().includes(q))
  );
}

/** Ties break on the id, so a row never moves between pages. */
function compareBy(sort: string) {
  const [field, direction] = sort.split(",") as [SortField, "asc" | "desc"];
  const sign = direction === "asc" ? 1 : -1;
  return (a: ProductSummary, b: ProductSummary) => {
    const left = a[field];
    const right = b[field];
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
    return sign * order || a.id.localeCompare(b.id);
  };
}
