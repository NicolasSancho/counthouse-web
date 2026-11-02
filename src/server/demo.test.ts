import { describe, expect, it } from "vitest";

import { createApiClient } from "@/server/api/client";
import { getDemoAccounts } from "@/server/demo";
import { contractChecks } from "@/server/mock/contract-checks";

const api = createApiClient({ mode: "mock" }, { mockLatencyMs: 0 });
api.use(contractChecks());

describe("getDemoAccounts", () => {
  it("lists the Admin of the branded tenant first, then the other accounts", () => {
    expect(getDemoAccounts().map(({ name, role, tenantName }) => [name, role, tenantName])).toEqual(
      [
        ["Ana Torres", "ADMIN", "Northwind Footwear"],
        ["Iris Chen", "OPERATOR", "Northwind Footwear"],
        ["Marta Silva", "ADMIN", "Acme"],
        ["Omar Reyes", "OPERATOR", "Acme"],
      ]
    );
  });

  it.each(getDemoAccounts())("$email signs in with the mock", async ({ email, password }) => {
    const { response } = await api.POST("/auth/login", { body: { email, password } });
    expect(response.status).toBe(200);
  });
});
