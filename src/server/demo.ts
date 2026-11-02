import "server-only";

import type { Role } from "@/server/api/schema";
import { DEMO_PASSWORD, tenants, users } from "@/server/mock/demo-data";

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  role: Role;
  tenantName: string;
};

/**
 * The public demo accounts, for the sign-in page. The first one is the Admin of the tenant that
 * has its own brand, so "Enter the demo" shows theming from the first screen. The accounts exist
 * only in mock mode; callers check the mode.
 */
export function getDemoAccounts(): DemoAccount[] {
  const accounts = users.flatMap((user) => {
    const tenant = tenants.find((candidate) => candidate.id === user.tenantId);
    if (!tenant) return [];
    const account: DemoAccount = {
      email: user.email,
      password: DEMO_PASSWORD,
      name: user.name,
      role: user.role,
      tenantName: tenant.name,
    };
    return [{ account, main: user.role === "ADMIN" && tenant.theme !== undefined }];
  });
  return [...accounts.filter(({ main }) => main), ...accounts.filter(({ main }) => !main)].map(
    ({ account }) => account
  );
}
