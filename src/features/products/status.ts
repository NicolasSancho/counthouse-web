import type { Badge } from "@nicolassancho/storybook-core";
import type { ComponentProps } from "react";

import type { ProductStatus, VariantStatus } from "@/server/api/schema";

export const STATUS_NAMES: Record<ProductStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  ARCHIVED: "Archived",
};

/** What a product's status means for the people who sell and count it. */
export const STATUS_MEANINGS: Record<ProductStatus, string> = {
  ACTIVE: "For sale. Shown in the default product list.",
  DRAFT: "Not for sale yet. Shown in the default product list as a draft.",
  ARCHIVED: "Not for sale. Hidden from the default list; filter by Archived to find it.",
};

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

/** Active reads as success; draft and archived stay neutral and rely on their text. */
export const statusBadgeVariant = (status: ProductStatus | VariantStatus): BadgeVariant =>
  status === "ACTIVE" ? "success" : "neutral";
