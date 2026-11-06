import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  applyChange,
  changedFields,
  nextSort,
  parseProductQuery,
  productsHref,
  type ProductListState,
  type ProductQuery,
  type ProductSort,
  type SortField,
} from "@/features/products/product-query";
import type { ProductStatus } from "@/server/api/schema";

/** What a link does: its `href` was built on the server from the URL, as `ProductLink` assumes. */
const linkPatch = (committed: ProductQuery, target: ProductQuery) => {
  const { searchParams } = new URL(productsHref(target), "http://localhost");
  return changedFields(committed, parseProductQuery(Object.fromEntries(searchParams)));
};

const sameFilters = (a: ProductQuery, b: ProductQuery) =>
  a.q === b.q && a.status === b.status && a.sort === b.sort;

type Action =
  | { type: "type"; text: string }
  | { type: "send" }
  | { type: "status"; status: ProductStatus | undefined }
  | { type: "sort"; field: SortField }
  | { type: "page"; step: -1 | 1 }
  | { type: "clear" }
  | { type: "settle" };

// Up to 50 characters of up to two code units each, so every search fits the limit.
const text = fc.string({ unit: "binary", maxLength: 50 });
const status = fc.constantFrom<ProductStatus | undefined>("ACTIVE", "DRAFT", "ARCHIVED", undefined);
const sort = fc.constantFrom<ProductSort>("name,asc", "name,desc", "basePriceCents,asc");
const field = fc.constantFrom<SortField>("name", "basePriceCents");
const query: fc.Arbitrary<ProductQuery> = fc.record({
  q: text,
  status,
  sort: fc.option(sort, { nil: undefined }),
  page: fc.integer({ min: 1, max: 5 }),
});
const action: fc.Arbitrary<Action> = fc.oneof(
  fc.record({ type: fc.constant("type" as const), text }),
  fc.record({ type: fc.constant("send" as const) }),
  fc.record({ type: fc.constant("status" as const), status }),
  fc.record({ type: fc.constant("sort" as const), field }),
  fc.record({ type: fc.constant("page" as const), step: fc.constantFrom<-1 | 1>(-1, 1) }),
  fc.record({ type: fc.constant("clear" as const) }),
  fc.record({ type: fc.constant("settle" as const) })
);

const CLEARED = { q: "", status: undefined, sort: undefined, page: 1 };

/**
 * The change an action makes, or nothing when it only moves the state along. The links are the ones
 * the page renders: a column's next sort, and Previous and Next. None points at the current value.
 */
function patchOf(action: Action, committed: ProductQuery): Partial<ProductQuery> | undefined {
  switch (action.type) {
    case "send":
      return {};
    case "status":
      return { status: action.status, page: 1 };
    case "sort":
      return linkPatch(committed, {
        ...committed,
        sort: nextSort(committed.sort, action.field),
        page: 1,
      });
    case "page":
      return linkPatch(committed, {
        ...committed,
        page: Math.max(1, committed.page + action.step),
      });
    case "clear":
      return CLEARED;
    default:
      return undefined;
  }
}

describe("a sequence of changes, some made while others load", () => {
  it("keeps the last choice of each filter, whatever the links on screen were built from", () => {
    fc.assert(
      fc.property(query, fc.array(action, { maxLength: 12 }), (start, actions) => {
        const list: ProductListState = { committed: start, query: start, search: start.q };
        const wanted = { q: start.q, status: start.status, sort: start.sort };

        for (const step of actions) {
          if (step.type === "type") list.search = wanted.q = step.text;
          if (step.type === "status") wanted.status = step.status;
          if (step.type === "sort") wanted.sort = nextSort(list.committed.sort, step.field);
          if (step.type === "clear") {
            wanted.q = "";
            wanted.status = wanted.sort = undefined;
          }
          if (step.type === "settle") list.committed = list.query;

          const patch = patchOf(step, list.committed);
          if (!patch) continue;
          list.query = applyChange(list, patch);
          list.search = list.query.q;

          const { page, ...filters } = list.query;
          expect(filters).toEqual(wanted);
          // A page number from one result set must never land on another.
          if (!sameFilters(list.query, list.committed)) expect(page).toBe(1);
        }
      }),
      { numRuns: 2000 }
    );
  });

  it("goes to the first page when a filter differs from the URL, and only then resets it", () => {
    fc.assert(
      fc.property(query, query, fc.integer({ min: 1, max: 5 }), (committed, pending, page) => {
        const list = { committed, query: pending, search: pending.q };
        const next = applyChange(list, { page });

        expect(next.page).toBe(sameFilters(next, committed) ? page : 1);
      })
    );
  });

  it("sends typed text with any change, unless the change sets its own search", () => {
    fc.assert(
      fc.property(query, text, text, (start, typed, own) => {
        const list = { committed: start, query: start, search: typed };

        expect(applyChange(list, { status: "DRAFT" }).q).toBe(typed);
        expect(applyChange(list, { q: own }).q).toBe(own);
      })
    );
  });
});

describe("the URL of a list", () => {
  it("gives back the same list when read", () => {
    fc.assert(
      fc.property(query, (list) => {
        const { searchParams } = new URL(productsHref(list), "http://localhost");
        expect(parseProductQuery(Object.fromEntries(searchParams))).toEqual(list);
      })
    );
  });

  it("can be written for anything a hand-edited URL holds", () => {
    const value = fc.string({ unit: "binary-ascii", maxLength: 120 });
    const longText = fc.string({ unit: "binary", minLength: 90, maxLength: 120 });
    fc.assert(
      fc.property(fc.oneof(value, longText), value, value, value, (q, status, sort, page) => {
        const list = parseProductQuery({ q, status, sort, page });
        const { searchParams } = new URL(productsHref(list), "http://localhost");
        expect(parseProductQuery(Object.fromEntries(searchParams))).toEqual(list);
      })
    );
  });
});
