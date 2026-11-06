import type { Metadata } from "next";

import { parseProductQuery } from "@/features/products/product-query";
import { ProductsScreen } from "@/features/products/products-screen";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  return <ProductsScreen query={parseProductQuery(await searchParams)} />;
}
