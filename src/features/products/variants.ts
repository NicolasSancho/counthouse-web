import type { Variant } from "@/server/api/schema";

/** Active variants first, then archived ones, each group in the API's order. */
export function orderVariants(variants: readonly Variant[]): Variant[] {
  return [
    ...variants.filter(({ status }) => status === "ACTIVE"),
    ...variants.filter(({ status }) => status !== "ACTIVE"),
  ];
}

/** Counts for the page, where units on hand cover active variants only, as the list's Stock does. */
export function variantStats(variants: readonly Variant[]) {
  const active = variants.filter(({ status }) => status === "ACTIVE");
  return {
    active: active.length,
    archived: variants.length - active.length,
    units: active.reduce((sum, { stockOnHand }) => sum + stockOnHand, 0),
  };
}
