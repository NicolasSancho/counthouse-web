import type { Metadata } from "next";
import { Suspense } from "react";

import { parseProductQuery, productsHref } from "@/features/products/product-query";
import { ProductScreen, ProductScreenSkeleton } from "@/features/products/product-screen";
import { getProduct } from "@/features/products/queries";

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const read = await getProduct((await params).id);
  if (read.ok) return { title: `${read.value.name} · Products` };
  return { title: read.reason === "not-found" ? "Product not found" : "Product" };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/products/[id]">) {
  const query = parseProductQuery(await searchParams);
  const backHref = productsHref(query);

  return (
    <Suspense fallback={<ProductScreenSkeleton backHref={backHref} />}>
      <ProductScreen segment={params.then(({ id }) => id)} query={query} backHref={backHref} />
    </Suspense>
  );
}
