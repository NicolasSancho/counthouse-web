import { describe, expect, it } from "vitest";

import { orderVariants, variantStats } from "@/features/products/variants";
import type { Variant } from "@/server/api/schema";

const variant = (sku: string, status: Variant["status"], stockOnHand = 1): Variant => ({
  id: sku,
  productId: "p",
  sku,
  optionValues: [],
  stockOnHand,
  status,
});

const variants = [
  variant("A", "ARCHIVED", 50),
  variant("B", "ACTIVE", 3),
  variant("C", "ARCHIVED", 7),
  variant("D", "ACTIVE", 0),
];

describe("variants", () => {
  it("puts archived variants last and keeps the API's order within each group", () => {
    expect(orderVariants(variants).map(({ sku }) => sku)).toEqual(["B", "D", "A", "C"]);
  });

  it("counts variants, and units on active variants only", () => {
    expect(variantStats(variants)).toEqual({ active: 2, archived: 2, units: 3 });
  });
});
