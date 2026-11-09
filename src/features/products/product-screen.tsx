import {
  Badge,
  Card,
  EmptyState,
  Icon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableSkeleton,
  Text,
  TextLink,
} from "@nicolassancho/storybook-core";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { formatDate, formatDateTime, formatPrice } from "@/features/products/format";
import { LoadFailedAlert } from "@/features/products/load-failed-alert";
import { productHref } from "@/features/products/product-query";
import type { ProductQuery } from "@/features/products/product-query";
import { getProduct, normalizeProductId } from "@/features/products/queries";
import { STATUS_MEANINGS, STATUS_NAMES, statusBadgeVariant } from "@/features/products/status";
import { orderVariants, variantStats } from "@/features/products/variants";
import type { ProductDetail, Variant } from "@/server/api/schema";
import { getCurrentUser } from "@/server/auth";
import { getFormatLocales } from "@/server/locale";
import { NavLink } from "@/shared/nav-link";

/**
 * The way back to the list the product was opened from. The visible text matches the navigation
 * link, so the accessible name says where it goes.
 */
export function BackToProducts({ href }: { href: string }) {
  return (
    <TextLink
      href={href}
      LinkComponent={NavLink}
      className="inline-flex items-center gap-1 text-sm text-neutral-600 no-underline hover:text-neutral-900 hover:underline"
    >
      <Icon name="ArrowLeft" size="small" />
      <span aria-hidden="true">Products</span>
      <span className="sr-only">Back to products</span>
    </TextLink>
  );
}

/** One style for every card heading on the page. */
function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Text as="h2" id={id} size="small" weight="semibold" color="darker">
      {children}
    </Text>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card>
      <section aria-labelledby={id} className="p-4">
        <SectionHeading id={id}>{title}</SectionHeading>
        {children}
      </section>
    </Card>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="text-neutral-600">{term}</dt>
      <dd className="text-neutral-900 tabular-nums">{children}</dd>
    </div>
  );
}

function VariantRow({ variant }: { variant: Variant }) {
  const soldOut = variant.status === "ACTIVE" && variant.stockOnHand === 0;
  return (
    <TableRow>
      <TableCell className="font-mono text-[0.8125rem]">{variant.sku}</TableCell>
      {variant.optionValues.map((value, index) => (
        <TableCell key={index}>{value}</TableCell>
      ))}
      <TableCell align="right">
        {soldOut ? <span className="text-neutral-600">Out of stock</span> : variant.stockOnHand}
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant(variant.status)}>{STATUS_NAMES[variant.status]}</Badge>
      </TableCell>
    </TableRow>
  );
}

function Variants({ product }: { product: ProductDetail }) {
  const { active, archived } = variantStats(product.variants);
  return (
    <Card>
      <section aria-labelledby="product-variants">
        <div className="flex flex-wrap items-baseline gap-x-2 px-4 pt-4 pb-3">
          <SectionHeading id="product-variants">Variants</SectionHeading>
          <p className="text-sm text-neutral-600">
            {active} active{archived > 0 ? ` · ${archived} archived` : ""}
          </p>
        </div>
        <Table label="Variants table" caption={`Variants of ${product.name}`}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>SKU</TableHeaderCell>
              {product.optionNames.map((name) => (
                <TableHeaderCell key={name}>{name}</TableHeaderCell>
              ))}
              <TableHeaderCell align="right">Stock</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orderVariants(product.variants).map((variant) => (
              <VariantRow key={variant.id} variant={variant} />
            ))}
          </TableBody>
        </Table>
      </section>
    </Card>
  );
}

/** Two columns from `lg` up; `minmax(0, 1fr)` lets a wide table scroll instead of widening the page. */
const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6";

/**
 * One product. The side column (Status, Details) comes first in the code, so on narrow screens it
 * shows before the variants table; from `lg` up the grid places it on the right. The product and
 * the user are read together, as on the list; a failed product read has its own message.
 */
export async function ProductScreen({
  segment,
  query,
  backHref,
}: {
  segment: Promise<string>;
  query: ProductQuery;
  backHref: string;
}) {
  const id = await segment;
  const [read, user] = await Promise.allSettled([getProduct(id), getCurrentUser()]);
  if (read.status === "rejected") throw read.reason;
  if (!read.value.ok) {
    if (read.value.reason === "not-found") notFound();
    return (
      <>
        <BackToProducts href={backHref} />
        <LoadFailedAlert
          title="This product could not load."
          // A plain link: Retry loads the page again as a new document, like the shell's Retry.
          retryHref={productHref(normalizeProductId(id) ?? id, query)}
          traceId={read.value.traceId}
          className="mt-4"
        />
      </>
    );
  }
  if (user.status === "rejected") throw user.reason;

  const product = read.value.value;
  const { units } = variantStats(product.variants);
  const locales = await getFormatLocales();

  return (
    <>
      <BackToProducts href={backHref} />
      <div className="mt-2 mb-6 min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Text
            as="h1"
            size="large"
            weight="semibold"
            color="darker"
            className="min-w-0 [overflow-wrap:anywhere]"
          >
            {product.name}
          </Text>
          <Badge variant={statusBadgeVariant(product.status)}>{STATUS_NAMES[product.status]}</Badge>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          Updated{" "}
          <time dateTime={product.updatedAt}>
            {formatDateTime(product.updatedAt, locales.dates)}
          </time>
          <span aria-hidden="true" className="mx-1.5 text-neutral-400">
            ·
          </span>
          Created{" "}
          <time dateTime={product.createdAt}>{formatDate(product.createdAt, locales.dates)}</time>
        </p>
      </div>

      <div className={COLUMNS}>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1">
          <Section id="product-status" title="Status">
            <p className="mt-2 text-sm text-neutral-600">{STATUS_MEANINGS[product.status]}</p>
          </Section>
          <Section id="product-details" title="Details">
            <dl className="mt-3 divide-y divide-neutral-200 text-sm">
              <Fact term="Price">
                {formatPrice(
                  product.basePriceCents,
                  user.value.tenant.defaultCurrency,
                  locales.numbers
                )}
              </Fact>
              <Fact term="Units on hand">{units}</Fact>
            </dl>
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          {product.description ? (
            <Section id="product-description" title="Description">
              <p className="mt-2 max-w-prose text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-line text-neutral-900">
                {product.description}
              </p>
            </Section>
          ) : null}
          <Variants product={product} />
        </div>
      </div>
    </>
  );
}

/** The first load: the same two columns, so nothing moves when the product arrives. */
export function ProductScreenSkeleton({ backHref }: { backHref: string }) {
  return (
    <>
      <BackToProducts href={backHref} />
      <div
        aria-hidden="true"
        className="mt-3 mb-7 animate-pulse space-y-3 motion-reduce:animate-none"
      >
        <div className="h-6 w-56 max-w-full rounded-sm bg-neutral-200" />
        <div className="h-3 w-72 max-w-full rounded-sm bg-neutral-200" />
      </div>
      <div className={COLUMNS}>
        <Card className="h-32 lg:col-start-2 lg:row-start-1">
          <div aria-hidden="true" className="animate-pulse p-4 motion-reduce:animate-none">
            <div className="h-3 w-16 rounded-sm bg-neutral-200" />
            <div className="mt-4 h-3 w-full rounded-sm bg-neutral-200" />
          </div>
        </Card>
        <Card className="min-w-0 lg:col-start-1 lg:row-start-1">
          <TableSkeleton label="Loading product" rows={4} columns={4} />
        </Card>
      </div>
    </>
  );
}

/** For a product that does not exist, or that belongs to another tenant (the API says 404 to both). */
export function ProductNotFound({ backAction }: { backAction: ReactNode }) {
  return (
    <Card>
      <EmptyState
        title="Product not found."
        description="This product doesn't exist, or you don't have access to it."
        action={backAction}
      />
    </Card>
  );
}
