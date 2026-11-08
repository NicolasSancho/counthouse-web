import { ListReturnLink } from "@/features/products/list-return-link";
import { ProductNotFound } from "@/features/products/product-screen";

// The title comes from the page's `generateMetadata`.
export default function NotFound() {
  return <ProductNotFound backAction={<ListReturnLink />} />;
}
