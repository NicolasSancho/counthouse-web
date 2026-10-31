import { Text } from "@nicolassancho/storybook-core";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <Text as="h1" size="large" weight="semibold" color="darker">
      Products
    </Text>
  );
}
