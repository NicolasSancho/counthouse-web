import type { Role } from "@/server/api/schema";

/** How a role reads in the UI. A role added to the contract fails `typecheck` until it is here. */
export const ROLE_NAMES: Record<Role, string> = { ADMIN: "Admin", OPERATOR: "Operator" };
