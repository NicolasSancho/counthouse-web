"use client";

import { ButtonLink } from "@nicolassancho/storybook-core";
import { useSearchParams } from "next/navigation";

import { parseProductQuery, productsHref } from "@/features/products/product-query";
import { NavLink } from "@/shared/nav-link";

/**
 * "Back to products" for `not-found.tsx`, which gets no props: it reads the list state from the
 * URL itself, as the product page does.
 */
export function ListReturnLink() {
  const params = Object.fromEntries(useSearchParams());
  return (
    <ButtonLink
      href={productsHref(parseProductQuery(params))}
      variant="outline"
      LinkComponent={NavLink}
    >
      Back to products
    </ButtonLink>
  );
}
