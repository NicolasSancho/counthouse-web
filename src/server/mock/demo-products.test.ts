import { describe, expect, it } from "vitest";

import { products, toSummary } from "@/server/mock/demo-products";

// The rules the contract states in prose, which its schemas cannot check.
describe("demo products", () => {
  it.each(products.map(({ detail }) => [detail.name, detail] as const))(
    "%s follows the contract's product rules",
    (_, detail) => {
      expect(detail.variants.length).toBeGreaterThan(0);
      for (const variant of detail.variants) {
        expect(variant.optionValues).toHaveLength(detail.optionNames.length);
        expect(variant.productId).toBe(detail.id);
      }
      if (detail.optionNames.length === 0) expect(detail.variants).toHaveLength(1);

      const combinations = detail.variants.map(({ optionValues }) => optionValues.join("|"));
      expect(new Set(combinations).size).toBe(combinations.length);
    }
  );

  it("never repeats a SKU or an id within a tenant, without regard to case", () => {
    for (const tenantId of new Set(products.map((product) => product.tenantId))) {
      const own = products.filter((product) => product.tenantId === tenantId);
      const skus = own.flatMap(({ detail }) => detail.variants.map(({ sku }) => sku.toLowerCase()));
      const ids = own.flatMap(({ detail }) => [detail.id, ...detail.variants.map(({ id }) => id)]);

      expect(new Set(skus).size).toBe(skus.length);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("summarizes a product from its active variants only", () => {
    const runner = products.find(({ detail }) => detail.name === "Trail Runner")?.detail;
    if (!runner) throw new Error("No Trail Runner");
    const active = runner.variants.filter(({ status }) => status === "ACTIVE");

    expect(runner.variants.length).toBeGreaterThan(active.length);
    expect(toSummary(runner)).toMatchObject({
      variantCount: active.length,
      totalStock: active.reduce((sum, { stockOnHand }) => sum + stockOnHand, 0),
    });
  });
});
