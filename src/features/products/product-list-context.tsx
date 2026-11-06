"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import {
  applyChange,
  changedFields,
  parseProductQuery,
  productsHref,
  type ProductQuery,
} from "@/features/products/product-query";
import { NavLink } from "@/shared/nav-link";

const SEARCH_DELAY_MS = 300;

interface ProductList {
  /** The list as the user last asked for it, ahead of the URL while a change is loading. */
  query: ProductQuery;
  /** The list in the URL, which the links on screen were built from. */
  committed: ProductQuery;
  isPending: boolean;
  /** The text in the search box, ahead of `query.q` while the user types. */
  search: string;
  setSearch: (value: string) => void;
  change: (patch: Partial<ProductQuery>, options?: { replace?: boolean }) => void;
}

const ProductListContext = createContext<ProductList | null>(null);

export function useProductList(): ProductList {
  const list = use(ProductListContext);
  if (!list) throw new Error("Render this inside ProductListProvider.");
  return list;
}

/**
 * The one owner of the list's state, so a change made while another loads builds on it instead of
 * undoing it. Every change runs in a transition: React keeps the current rows on screen until the
 * new ones arrive, so they can dim and focus stays where it was. A `Suspense` keyed by the URL would
 * show its fallback instead and drop focus to `<body>`.
 */
export function ProductListProvider({
  query: committed,
  children,
}: {
  query: ProductQuery;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setOptimisticQuery] = useOptimistic(committed);
  const [search, setSearch] = useState(committed.q);
  const [sentSearch, setSentSearch] = useState(committed.q);

  // Nothing is loading and the URL has another search: Back, or a search that was abandoned. The URL
  // wins. While something loads the two differ on purpose, and what the user types is left alone.
  if (!isPending && sentSearch !== committed.q) {
    setSentSearch(committed.q);
    setSearch(committed.q);
  }

  const change: ProductList["change"] = (patch, { replace = false } = {}) => {
    const next = applyChange({ committed, query, search }, patch);
    setSearch(next.q);
    setSentSearch(next.q);
    startTransition(() => {
      setOptimisticQuery(next);
      const href = productsHref(next) as Route;
      if (replace) router.replace(href);
      else router.push(href);
    });
  };

  // `replace`, so each pause while typing does not add a step to Back.
  const sendSearch = useEffectEvent(() => change({}, { replace: true }));
  useEffect(() => {
    if (search === sentSearch) return;
    const timer = setTimeout(sendSearch, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, sentSearch]);

  return (
    <ProductListContext value={{ query, committed, isPending, search, setSearch, change }}>
      {children}
    </ProductListContext>
  );
}

/**
 * Dims the results while a change is loading. The link just used can vanish with the change, such
 * as Next on the last page, which would leave focus on `<body>`, so focus moves here instead.
 */
export function ProductResultsPane({ children }: { children: ReactNode }) {
  const { isPending } = useProductList();
  const pane = useRef<HTMLDivElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && document.activeElement === document.body) {
      pane.current?.focus({ preventScroll: true });
    }
    wasPending.current = isPending;
  }, [isPending]);

  return (
    <div
      ref={pane}
      tabIndex={-1}
      aria-busy={isPending}
      className={`focus:outline-hidden ${isPending ? "opacity-50 transition-opacity" : ""}`}
    >
      {children}
    </div>
  );
}

type ListLinkProps = { href: string; children: ReactNode; className?: string };

/**
 * A link inside the list, for `LinkComponent`. Its `href` was built on the server from the URL, so
 * only what it changes is applied, on top of any change still loading. `onNavigate` runs only for a
 * same-tab client navigation, so ctrl-click and middle-click still open a new tab.
 */
export function ProductLink({ href, children, className }: ListLinkProps) {
  const { committed, change } = useProductList();
  return (
    <NavLink
      href={href}
      className={className}
      onNavigate={(event) => {
        event.preventDefault();
        const { searchParams } = new URL(href, "http://localhost");
        change(changedFields(committed, parseProductQuery(Object.fromEntries(searchParams))));
      }}
    >
      {children}
    </NavLink>
  );
}

/** "Clear filters": sets every field, so text not sent yet goes too. */
export function ClearFiltersLink({ href, children, className }: ListLinkProps) {
  const { change } = useProductList();
  return (
    <NavLink
      href={href}
      className={className}
      onNavigate={(event) => {
        event.preventDefault();
        change({ q: "", status: undefined, sort: undefined, page: 1 });
      }}
    >
      {children}
    </NavLink>
  );
}
