import type { ProductStatus } from "@/server/api/schema";

export const PAGE_SIZE = 20;
/** The contract's limit on `q`: the API answers 400 above it. */
export const MAX_SEARCH_LENGTH = 100;

const SORT = /^(createdAt|updatedAt|name|basePriceCents),(asc|desc)$/;
const STATUSES: readonly string[] = ["DRAFT", "ACTIVE", "ARCHIVED"] satisfies ProductStatus[];

export type SortField = "createdAt" | "updatedAt" | "name" | "basePriceCents";
export type ProductSort = `${SortField},${"asc" | "desc"}`;

/** The list's state, as it lives in the URL. `page` is 1-based; the API's is 0-based. */
export interface ProductQuery {
  q: string;
  status?: ProductStatus;
  sort?: ProductSort;
  page: number;
}

type SearchParams = Record<string, string | string[] | undefined>;

const isStatus = (value: string): value is ProductStatus => STATUSES.includes(value);
const isSort = (value: string): value is ProductSort => SORT.test(value);

/**
 * Reads the list's state from the URL. The URL is user input: a value the API would refuse falls
 * back to its default, so a hand-edited or old link still shows the list.
 */
export function parseProductQuery(params: SearchParams): ProductQuery {
  const read = (name: string) => {
    const value = params[name];
    return typeof value === "string" ? value : "";
  };
  const status = read("status");
  const sort = read("sort");
  const page = read("page");

  return {
    // `toWellFormed`, because a cut can split an emoji and half a character cannot go in a URL.
    q: read("q").slice(0, MAX_SEARCH_LENGTH).toWellFormed(),
    status: isStatus(status) ? status : undefined,
    sort: isSort(sort) ? sort : undefined,
    page: /^[1-9]\d*$/.test(page) && Number.isSafeInteger(Number(page)) ? Number(page) : 1,
  };
}

/** The URL of a list state. Defaults are left out, so the plain list stays `/products`. */
export function productsHref({ q, status, sort, page }: ProductQuery): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (sort) params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/products?${search}` : "/products";
}

/** What differs between two list states. */
export function changedFields(from: ProductQuery, to: ProductQuery): Partial<ProductQuery> {
  const patch: Partial<ProductQuery> = {};
  if (to.q !== from.q) patch.q = to.q;
  if (to.status !== from.status) patch.status = to.status;
  if (to.sort !== from.sort) patch.sort = to.sort;
  if (to.page !== from.page) patch.page = to.page;
  return patch;
}

/** The list as it stands when a change is made. */
export interface ProductListState {
  /** The list in the URL, which the links on screen were built from. */
  committed: ProductQuery;
  /** The list as last asked for, ahead of `committed` while a change is loading. */
  query: ProductQuery;
  /** The text in the search box, ahead of `query.q` while the user types. */
  search: string;
}

/**
 * The list a change leads to. It builds on any change still loading, not on the URL, and takes typed
 * text that has not gone out yet, unless the change sets its own.
 */
export function applyChange(
  { committed, query, search }: ProductListState,
  patch: Partial<ProductQuery>
): ProductQuery {
  const next = { ...query, q: search, ...patch };
  // Page numbers belong to one result set, so any other change goes back to the first page.
  const samePage = { ...next, page: committed.page };
  return Object.keys(changedFields(committed, samePage)).length > 0 ? { ...next, page: 1 } : next;
}

/** The next sort of a column: ascending first, then it flips. It always goes back to page 1. */
export function nextSort(current: ProductSort | undefined, field: SortField): ProductSort {
  return current === `${field},asc` ? `${field},desc` : `${field},asc`;
}

/** The value of `aria-sort` for a column, which only the sorted column carries. */
export function sortDirection(
  current: ProductSort | undefined,
  field: SortField
): "ascending" | "descending" | undefined {
  if (current === `${field},asc`) return "ascending";
  if (current === `${field},desc`) return "descending";
  return undefined;
}
