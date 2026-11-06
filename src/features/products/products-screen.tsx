import { Card, TableSkeleton, Text } from "@nicolassancho/storybook-core";
import { Suspense } from "react";

import { ProductFilters } from "@/features/products/product-filters";
import { ProductListProvider, ProductResultsPane } from "@/features/products/product-list-context";
import { PAGE_SIZE, type ProductQuery } from "@/features/products/product-query";
import { ProductResults } from "@/features/products/product-results";

/**
 * The list screen. The `Suspense` has no key on purpose: its fallback shows on the first load only,
 * and later changes keep the rows on screen (see `ProductListProvider`).
 */
export function ProductsScreen({ query }: { query: ProductQuery }) {
  return (
    <ProductListProvider query={query}>
      <Text as="h1" size="large" weight="semibold" color="darker" className="mb-4">
        Products
      </Text>
      <Card>
        <ProductFilters />
        <ProductResultsPane>
          <Suspense
            fallback={<TableSkeleton label="Loading products" rows={PAGE_SIZE} columns={6} />}
          >
            <ProductResults query={query} />
          </Suspense>
        </ProductResultsPane>
      </Card>
    </ProductListProvider>
  );
}
