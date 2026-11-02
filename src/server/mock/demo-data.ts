import "server-only";

import type { Tenant, User } from "@/server/api/schema";

/**
 * The public demo: two tenants with an admin and an operator each. Every account is public and
 * shares one password. Ana, Omar, their tenants, the email format and the password come from the
 * contract's examples.
 */

export const DEMO_PASSWORD = "demo-password";

export const tenants: readonly Tenant[] = [
  {
    id: "0b9d6e21-7c3a-4f58-8a14-5e2c9d7b1a36",
    slug: "northwind",
    name: "Northwind Footwear",
    defaultCurrency: "EUR",
    theme: { primary: "#1f5f4a" },
  },
  {
    id: "7a1e4c90-2d6b-4b83-a5f0-9c3e8d1b2a47",
    slug: "acme",
    name: "Acme",
    defaultCurrency: "USD",
  },
];

export const users: readonly User[] = [
  {
    id: "3f2c8a54-1b6d-4e0a-9c57-2d8e1f4a6b70",
    tenantId: "0b9d6e21-7c3a-4f58-8a14-5e2c9d7b1a36",
    email: "ana@counthouse.example",
    name: "Ana Torres",
    role: "ADMIN",
  },
  {
    id: "e4ee81a9-de34-4b8d-aa60-c1b0a472f41f",
    tenantId: "0b9d6e21-7c3a-4f58-8a14-5e2c9d7b1a36",
    email: "iris@counthouse.example",
    name: "Iris Chen",
    role: "OPERATOR",
  },
  {
    id: "7615584a-1cc4-4ad2-a199-528630588a96",
    tenantId: "7a1e4c90-2d6b-4b83-a5f0-9c3e8d1b2a47",
    email: "marta@counthouse.example",
    name: "Marta Silva",
    role: "ADMIN",
  },
  {
    id: "9a41d7e2-6c08-4b35-8e1f-3d5b7a2c9e60",
    tenantId: "7a1e4c90-2d6b-4b83-a5f0-9c3e8d1b2a47",
    email: "omar@counthouse.example",
    name: "Omar Reyes",
    role: "OPERATOR",
  },
];
