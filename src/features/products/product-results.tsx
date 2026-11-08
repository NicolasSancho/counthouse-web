import {
  Badge,
  EmptyState,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextLink,
} from "@nicolassancho/storybook-core";

import { emptyKind } from "@/features/products/empty-state";
import { formatDate, formatPrice } from "@/features/products/format";
import { LoadFailedAlert } from "@/features/products/load-failed-alert";
import { ClearFiltersLink, ProductLink } from "@/features/products/product-list-context";
import {
  nextSort,
  PAGE_SIZE,
  productHref,
  productsHref,
  sortDirection,
  type ProductQuery,
  type ProductSort,
  type SortField,
} from "@/features/products/product-query";
import { listProducts } from "@/features/products/queries";
import { STATUS_NAMES, statusBadgeVariant } from "@/features/products/status";
import type { ProductSummary } from "@/server/api/schema";
import { getCurrentUser } from "@/server/auth";
import { getFormatLocales } from "@/server/locale";
import type { FormatLocales } from "@/shared/locale";
import { NavLink } from "@/shared/nav-link";

const SORT_NAMES: Record<SortField, string> = {
  createdAt: "date added",
  updatedAt: "last update",
  name: "name",
  basePriceCents: "price",
};

function order(sort: ProductSort | undefined) {
  if (!sort) return "newest first";
  const [field, direction] = sort.split(",") as [SortField, string];
  return `by ${SORT_NAMES[field]}, ${direction === "asc" ? "ascending" : "descending"}`;
}

function SortableHeader({
  field,
  query,
  align,
  children,
}: {
  field: SortField;
  query: ProductQuery;
  align?: "right";
  children: string;
}) {
  return (
    <TableHeaderCell
      href={productsHref({ ...query, sort: nextSort(query.sort, field), page: 1 })}
      sort={sortDirection(query.sort, field)}
      align={align}
      LinkComponent={ProductLink}
    >
      {children}
    </TableHeaderCell>
  );
}

function ProductRow({
  product,
  query,
  currency,
  locales,
}: {
  product: ProductSummary;
  query: ProductQuery;
  currency: string;
  locales: FormatLocales;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {/* Opening a product leaves the list, so this is a plain link, not a `ProductLink`. */}
        <TextLink href={productHref(product.id, query)} LinkComponent={NavLink}>
          {product.name}
        </TextLink>
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(product.status)}>{STATUS_NAMES[product.status]}</Badge>
      </TableCell>
      <TableCell align="right">{product.variantCount}</TableCell>
      <TableCell align="right">{product.totalStock}</TableCell>
      <TableCell align="right">
        {formatPrice(product.basePriceCents, currency, locales.numbers)}
      </TableCell>
      <TableCell>
        <time dateTime={product.updatedAt}>{formatDate(product.updatedAt, locales.dates)}</time>
      </TableCell>
    </TableRow>
  );
}

function Empty({ query }: { query: ProductQuery }) {
  switch (emptyKind(query)) {
    case "past-the-end":
      return (
        <EmptyState
          title="This page has no products."
          action={
            <TextLink href={productsHref({ ...query, page: 1 })} LinkComponent={ProductLink}>
              Go to the first page
            </TextLink>
          }
        />
      );
    case "no-results":
      return (
        <EmptyState
          title="No products match your search."
          action={
            <TextLink href="/products" LinkComponent={ClearFiltersLink}>
              Clear filters
            </TextLink>
          }
        />
      );
    case "no-products":
      return <EmptyState title="No products yet." />;
  }
}

/** What a screen reader hears after a change. It names the order, so a sort is announced too. */
function announcement(query: ProductQuery, shown: number, totalItems: number) {
  if (shown === 0) return "No products found.";
  const first = (query.page - 1) * PAGE_SIZE + 1;
  return `Showing ${first} to ${first + shown - 1} of ${totalItems} products, ${order(query.sort)}.`;
}

/** A polite live region only announces a change, so every outcome renders this same element. */
function Status({ children }: { children?: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

/**
 * The rows and their pagination. The list and the user are read together. `allSettled`, because a
 * failed list has its own message: with the API down both fail, and the list's has to win.
 */
export async function ProductResults({ query }: { query: ProductQuery }) {
  const [list, user] = await Promise.allSettled([listProducts(query), getCurrentUser()]);
  if (list.status === "rejected") throw list.reason;

  const read = list.value;
  if (!read.ok) {
    return (
      <>
        <Status />
        <LoadFailedAlert
          title="Products could not load."
          retryHref={productsHref(query)}
          LinkComponent={ProductLink}
          traceId={read.reason === "failed" ? read.traceId : undefined}
          className="m-3"
        />
      </>
    );
  }
  if (user.status === "rejected") throw user.reason;

  const { items, totalItems, totalPages } = read.value;
  const { page } = query;
  const { defaultCurrency } = user.value.tenant;
  const locales = await getFormatLocales();

  return (
    <>
      <Status>{announcement(query, items.length, totalItems)}</Status>
      {items.length === 0 ? (
        <Empty query={query} />
      ) : (
        <>
          <Table
            label="Products table"
            caption={`Products, ${order(query.sort)}. Name, Price and Updated sort.`}
            className="min-w-[44rem]"
          >
            <TableHead>
              <TableRow>
                <SortableHeader field="name" query={query}>
                  Name
                </SortableHeader>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell align="right">Variants</TableHeaderCell>
                <TableHeaderCell align="right">Stock</TableHeaderCell>
                <SortableHeader field="basePriceCents" query={query} align="right">
                  Price
                </SortableHeader>
                <SortableHeader field="updatedAt" query={query}>
                  Updated
                </SortableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  query={query}
                  currency={defaultCurrency}
                  locales={locales}
                />
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            previousHref={page > 1 ? productsHref({ ...query, page: page - 1 }) : undefined}
            nextHref={page < totalPages ? productsHref({ ...query, page: page + 1 }) : undefined}
            LinkComponent={ProductLink}
            className="border-t border-neutral-200 p-3"
          />
        </>
      )}
    </>
  );
}
