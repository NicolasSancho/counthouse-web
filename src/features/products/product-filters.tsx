"use client";

import { Input, Select } from "@nicolassancho/storybook-core";

import { useProductList } from "@/features/products/product-list-context";
import { MAX_SEARCH_LENGTH } from "@/features/products/product-query";
import type { ProductStatus } from "@/server/api/schema";

const STATUS_OPTIONS = [
  { value: "", label: "Active and draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

/** The search box and the status filter. Search runs after a pause in typing, or at once on Enter. */
export function ProductFilters() {
  const { query, search, setSearch, change } = useProductList();

  return (
    <form
      role="search"
      aria-label="Filter products"
      onSubmit={(event) => {
        event.preventDefault();
        change({}, { replace: true });
      }}
      className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3"
    >
      <Input
        label="Search products by name or SKU"
        hideLabel
        type="search"
        placeholder="Search by name or SKU"
        maxLength={MAX_SEARCH_LENGTH}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-64 max-w-full"
      />
      <Select
        label="Status"
        hideLabel
        options={STATUS_OPTIONS}
        value={query.status ?? ""}
        onChange={(event) =>
          change({
            status: (event.target.value || undefined) as ProductStatus | undefined,
            page: 1,
          })
        }
      />
    </form>
  );
}
