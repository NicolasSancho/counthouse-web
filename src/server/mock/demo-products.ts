import "server-only";

import type { ProductDetail, ProductStatus, ProductSummary, Variant } from "@/server/api/schema";
import { tenants } from "@/server/mock/demo-data";

/** A product as the mock stores it. The list's summary is derived from it, as the API derives it. */
export interface DemoProduct {
  tenantId: string;
  detail: ProductDetail;
}

/** The list's row for a product: `variantCount` and `totalStock` count active variants only. */
export function toSummary({ variants, ...product }: ProductDetail): ProductSummary {
  const active = variants.filter(({ status }) => status === "ACTIVE");
  return {
    id: product.id,
    name: product.name,
    basePriceCents: product.basePriceCents,
    status: product.status,
    variantCount: active.length,
    totalStock: active.reduce((sum, { stockOnHand }) => sum + stockOnHand, 0),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

const [northwind, acme] = tenants;

const DAY_MS = 86_400_000;
const LATEST_UPDATE = Date.UTC(2026, 9, 20, 16, 2, 11);

/** What one product looks like before ids, SKUs and dates are added. */
interface Spec {
  name: string;
  description: string;
  basePriceCents: number;
  status: ProductStatus;
  optionNames: string[];
  /** One entry per variant, in the API's order: its option values, SKU suffix and stock. */
  variants: { values: string[]; code: string; stock: number; archived?: boolean }[];
}

/**
 * Acme's catalog, written out by hand: each product shows one case the screens handle, and the
 * end-to-end tests refer to them by name. Acme has no archived product, which a list test relies on.
 */
const ACME: Spec[] = [
  {
    name: "Anvil",
    description: "Drop-forged steel anvil with a hardened face. Ships on a pallet.",
    basePriceCents: 24_900,
    status: "ACTIVE",
    // A product without options has exactly one variant.
    optionNames: [],
    variants: [{ values: [], code: "STD", stock: 6 }],
  },
  {
    name: "Claw Hammer",
    description: "Fiberglass handle with an anti-vibration grip.",
    basePriceCents: 2_900,
    status: "ACTIVE",
    optionNames: ["Head weight"],
    variants: [
      { values: ["16 oz"], code: "16OZ", stock: 40 },
      { values: ["20 oz"], code: "20OZ", stock: 0 },
      { values: ["24 oz"], code: "24OZ", stock: 12 },
    ],
  },
  {
    name: "Wrecking Bar",
    // A long unbroken string, as pasted links are, so the layout has to wrap it.
    description:
      "Hex steel with a chisel end and a nail-pulling claw. Spec sheet: https://acme.example/specs/wrecking-bar-hex-steel-chisel-end-36in-rev-2026-10.pdf",
    basePriceCents: 3_400,
    status: "ACTIVE",
    optionNames: ["Length"],
    variants: [
      { values: ["24 in"], code: "24IN", stock: 18 },
      { values: ["36 in"], code: "36IN", stock: 9 },
      { values: ["48 in"], code: "48IN", stock: 0, archived: true },
    ],
  },
  {
    name: "Workbench",
    description: "Beech top with a front vise and a lower shelf.",
    basePriceCents: 38_900,
    status: "DRAFT",
    optionNames: ["Width"],
    variants: [
      { values: ["120 cm"], code: "120", stock: 0 },
      { values: ["150 cm"], code: "150", stock: 0 },
    ],
  },
  {
    name: "Tool Chest",
    description: "Steel chest with ball-bearing drawers and a locking lid.",
    basePriceCents: 18_900,
    status: "ACTIVE",
    optionNames: ["Drawers", "Color"],
    variants: [
      { values: ["5", "Red"], code: "5-RED", stock: 7 },
      { values: ["5", "Black"], code: "5-BLK", stock: 4 },
      { values: ["9", "Red"], code: "9-RED", stock: 3 },
      { values: ["9", "Black"], code: "9-BLK", stock: 2 },
    ],
  },
  {
    name: "Safety Goggles",
    // No description: the page leaves its card out.
    description: "",
    basePriceCents: 1_200,
    status: "ACTIVE",
    optionNames: ["Lens"],
    variants: [
      { values: ["Clear"], code: "CLR", stock: 120 },
      { values: ["Tinted"], code: "TNT", stock: 64 },
    ],
  },
];

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
const FOOTWEAR_STYLES: Record<string, string> = {
  Runner: "Lightweight running shoe with a cushioned midsole and a breathable mesh upper.",
  Loafer: "Leather slip-on with a padded footbed, made for long days in the office.",
  Boot: "Water-resistant leather boot with a lugged outsole for wet trails and city streets.",
  Sneaker: "Everyday low-top in canvas and suede, with a vulcanized rubber sole.",
  Sandal: "Adjustable strap sandal with a contoured cork footbed.",
};
const COLORS = [
  ["Black", "BLK"],
  ["Navy", "NVY"],
  ["Sand", "SND"],
  ["Olive", "OLV"],
] as const;
const SIZES = ["40", "41", "42", "43", "44", "45"];

/**
 * Northwind's catalog: 45 shoes, enough to page through. Status, color and the number of sizes
 * vary with the position, so every status filter finds rows. The cases a test needs are set by
 * name in `FOOTWEAR_CASES`.
 */
function footwear(name: string, index: number): Spec {
  const style = name.split(" ")[1] ?? "";
  const [color, code] = COLORS[index % COLORS.length] ?? COLORS[0];
  const status: ProductStatus = index % 9 === 8 ? "ARCHIVED" : index % 4 === 3 ? "DRAFT" : "ACTIVE";
  const sizes = SIZES.slice(0, (index % SIZES.length) + 1);
  const total = status === "DRAFT" ? 0 : (index * 37 + 84) % 240;
  const share = Math.floor(total / sizes.length);

  return {
    name,
    description: FOOTWEAR_STYLES[style] ?? "",
    basePriceCents: 2_400 + ((index * 1_300) % 16_000),
    status,
    optionNames: ["Color", "Size"],
    variants: sizes.map((size, position) => ({
      values: [color, size],
      code: `${code}-${size}`,
      stock: position === 0 ? total - share * (sizes.length - 1) : share,
    })),
  };
}

/** The cases a test needs, on named Northwind products. */
const FOOTWEAR_CASES: Record<string, (spec: Spec) => Spec> = {
  // An archived variant, listed after the active ones.
  "Trail Runner": (spec) => ({
    ...spec,
    variants: [
      ...spec.variants,
      { values: ["Black", "41"], code: "BLK-41", stock: 0, archived: true },
    ],
  }),
  // An active size with nothing on hand: "Out of stock".
  "Trail Boot": (spec) => ({
    ...spec,
    variants: spec.variants.map((variant, position) =>
      position === 1 ? { ...variant, stock: 0 } : variant
    ),
  }),
};

function build(tenantId: string, spec: Spec, index: number): DemoProduct {
  const tenant = tenantId.slice(0, 4);
  const id = `00000000-0000-4000-8000-${tenant}${String(index).padStart(8, "0")}`;
  const prefix = `${spec.name.replaceAll(/[^A-Z]/g, "")}${index}`;
  const updatedAt = LATEST_UPDATE - index * 2 * DAY_MS;

  const variants: Variant[] = spec.variants.map((variant, position) => ({
    id: `00000000-0000-4000-9000-${tenant}${String(index).padStart(4, "0")}${String(position).padStart(4, "0")}`,
    productId: id,
    sku: `${prefix}-${variant.code}`,
    optionValues: variant.values,
    stockOnHand: variant.stock,
    status: variant.archived ? "ARCHIVED" : "ACTIVE",
  }));

  return {
    tenantId,
    detail: {
      id,
      name: spec.name,
      description: spec.description,
      basePriceCents: spec.basePriceCents,
      status: spec.status,
      version: (index % 4) + 1,
      optionNames: spec.optionNames,
      variants,
      createdAt: new Date(updatedAt - 30 * DAY_MS).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
    },
  };
}

const shoes = FOOTWEAR_LINES.flatMap((line) =>
  Object.keys(FOOTWEAR_STYLES).map((style) => `${line} ${style}`)
).map((name, index) => {
  const spec = footwear(name, index);
  return FOOTWEAR_CASES[name]?.(spec) ?? spec;
});

/** The same data on every start, so tests and the public demo can rely on it. */
export const products: readonly DemoProduct[] = [
  ...(northwind ? shoes.map((spec, index) => build(northwind.id, spec, index)) : []),
  ...(acme ? ACME.map((spec, index) => build(acme.id, spec, index)) : []),
];
