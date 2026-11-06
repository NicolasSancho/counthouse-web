import "server-only";

import type { ProductStatus, ProductSummary } from "@/server/api/schema";
import { tenants } from "@/server/mock/demo-data";

/** A product as the mock stores it: the API's summary plus what it filters on. */
export interface DemoProduct {
  tenantId: string;
  skus: string[];
  summary: ProductSummary;
}

const [northwind, acme] = tenants;

const DAY_MS = 86_400_000;
const LATEST_UPDATE = Date.UTC(2026, 9, 20, 16, 2, 11);

const FOOTWEAR_LINES = [
  "Trail",
  "City",
  "Harbor",
  "Court",
  "Alpine",
  "Summit",
  "Coast",
  "Metro",
  "Ridge",
];
const FOOTWEAR_STYLES = ["Runner", "Loafer", "Boot", "Sneaker", "Sandal"];
const TOOLS = ["Anvil", "Hammer", "Crowbar", "Workbench", "Tool Chest", "Safety Goggles"];

/** The same data on every start, so tests and the public demo can rely on it. */
function buildProduct(tenantId: string, name: string, index: number): DemoProduct {
  // Mostly active, with some drafts and some archived, so each status filter finds rows.
  const status: ProductStatus = index % 9 === 8 ? "ARCHIVED" : index % 4 === 3 ? "DRAFT" : "ACTIVE";
  const variantCount = (index % 6) + 1;
  const code = name.replaceAll(/[^A-Z]/g, "");
  const updatedAt = LATEST_UPDATE - index * 2 * DAY_MS;

  return {
    tenantId,
    skus: Array.from({ length: variantCount }, (_, variant) => `${code}-${index}-${variant + 1}`),
    summary: {
      id: `00000000-0000-4000-8000-${tenantId.slice(0, 4)}${String(index).padStart(8, "0")}`,
      name,
      basePriceCents: 2_400 + ((index * 1_300) % 16_000),
      status,
      variantCount,
      totalStock: status === "DRAFT" ? 0 : (index * 37) % 240,
      createdAt: new Date(updatedAt - 30 * DAY_MS).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
    },
  };
}

const footwear = FOOTWEAR_LINES.flatMap((line) =>
  FOOTWEAR_STYLES.map((style) => `${line} ${style}`)
);

export const products: readonly DemoProduct[] = [
  ...(northwind ? footwear.map((name, index) => buildProduct(northwind.id, name, index)) : []),
  ...(acme ? TOOLS.map((name, index) => buildProduct(acme.id, name, index)) : []),
];
