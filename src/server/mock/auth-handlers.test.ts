import { describe, expect, it } from "vitest";

import { createApiClient } from "@/server/api/client";
import { contractChecks } from "@/server/mock/contract-checks";
import { createMockFetch, MOCK_BASE_URL } from "@/server/mock/fetch";
import { issue } from "@/server/mock/tokens";

// Every request goes through the real typed client and the mock `fetch`, as in the app, and every
// response is checked against the contract (status, content type, body schema and formats).
const api = createApiClient({ mode: "mock" }, { mockLatencyMs: 0 });
api.use(contractChecks());

const ANA = { email: "ana@counthouse.example", password: "demo-password" };
const ANA_ID = "3f2c8a54-1b6d-4e0a-9c57-2d8e1f4a6b70";
const REFRESH_LIFETIME_MS = 604_800_000;

const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

async function signIn() {
  const { data, error } = await api.POST("/auth/login", { body: ANA });
  if (!data) throw new Error(`Sign-in failed: ${JSON.stringify(error)}`);
  return data;
}

describe("POST /auth/login", () => {
  it("returns tokens that open /auth/me for the same user", async () => {
    const tokens = await signIn();
    expect(tokens).toMatchObject({ tokenType: "Bearer", expiresIn: 900, refreshExpiresIn: 604800 });

    const me = await api.GET("/auth/me", bearer(tokens.accessToken));
    expect(me.response.status).toBe(200);
    expect(me.data?.user).toMatchObject({ id: ANA_ID, name: "Ana Torres", role: "ADMIN" });
    expect(me.data?.tenant).toMatchObject({ slug: "northwind", theme: { primary: "#1f5f4a" } });
  });

  it.each([
    { case: "a wrong password", body: { ...ANA, password: "wrong" } },
    { case: "an unknown email", body: { ...ANA, email: "nobody@counthouse.example" } },
  ])("answers 401 INVALID_CREDENTIALS for $case", async ({ body }) => {
    const { response, error } = await api.POST("/auth/login", { body });
    expect(response.status).toBe(401);
    expect(error).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(error?.traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it("answers 400 with a code per field for an empty password and a malformed email", async () => {
    const { response, error } = await api.POST("/auth/login", {
      body: { email: "ana", password: "" },
    });
    expect(response.status).toBe(400);
    expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    // The order of the entries is not part of the contract.
    const fields = error?.errors?.map(({ field, code }) => ({ field, code }));
    expect(fields).toHaveLength(2);
    expect(fields).toEqual(
      expect.arrayContaining([
        { field: "email", code: "INVALID_FORMAT" },
        { field: "password", code: "REQUIRED" },
      ])
    );
  });

  it("answers 400 without field errors for an unknown body field", async () => {
    const { response, error } = await api.POST("/auth/login", {
      // The typed client does not reject an extra field at compile time, so the API must.
      body: { ...ANA, tenant: "northwind" },
    });
    expect(response.status).toBe(400);
    expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    expect(error?.errors).toBeUndefined();
  });

  // The typed client cannot send these, so they go to the mock `fetch` as raw requests.
  it.each([
    { case: "JSON null", body: "null" },
    { case: "a JSON string", body: '"ana"' },
    { case: "invalid JSON", body: "{" },
  ])("answers 400 when the body is $case", async ({ body }) => {
    const response = await createMockFetch({ latencyMs: 0 })(
      new Request(`${MOCK_BASE_URL}/auth/login`, { method: "POST", body })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "VALIDATION_FAILED",
      detail: "The body must be a JSON object.",
    });
  });
});

describe("GET /auth/me", () => {
  it("answers 401 TOKEN_EXPIRED for an expired access token", async () => {
    const issuedAt = Date.now() - 901_000;
    const { response, error } = await api.GET(
      "/auth/me",
      bearer(issue("access", ANA_ID, issuedAt))
    );
    expect(response.status).toBe(401);
    expect(error).toMatchObject({ code: "TOKEN_EXPIRED" });
  });

  it.each([
    { case: "a malformed token", init: bearer("not-a-token") },
    { case: "a refresh token", init: bearer(issue("refresh", ANA_ID)) },
    { case: "a missing header", init: {} },
  ])("answers 401 TOKEN_INVALID for $case", async ({ init }) => {
    const { response, error } = await api.GET("/auth/me", init);
    expect(response.status).toBe(401);
    expect(error).toMatchObject({ code: "TOKEN_INVALID" });
  });
});

describe("POST /auth/refresh", () => {
  it("exchanges a refresh token for an access token", async () => {
    const { refreshToken } = await signIn();
    const { response, data } = await api.POST("/auth/refresh", { body: { refreshToken } });
    expect(response.status).toBe(200);
    expect(data).toMatchObject({ tokenType: "Bearer", expiresIn: 900 });
    if (!data) throw new Error("Refresh failed");

    const me = await api.GET("/auth/me", bearer(data.accessToken));
    expect(me.data?.user.id).toBe(ANA_ID);
  });

  it.each([
    { case: "an access token", token: issue("access", ANA_ID), code: "TOKEN_INVALID" },
    {
      case: "an expired refresh token",
      token: issue("refresh", ANA_ID, Date.now() - REFRESH_LIFETIME_MS - 1000),
      code: "TOKEN_EXPIRED",
    },
  ])("answers 401 $code for $case", async ({ token, code }) => {
    const { response, error } = await api.POST("/auth/refresh", { body: { refreshToken: token } });
    expect(response.status).toBe(401);
    expect(error).toMatchObject({ code });
  });

  it("answers 400 REQUIRED for a missing refresh token", async () => {
    // @ts-expect-error The field is required by the contract.
    const { response, error } = await api.POST("/auth/refresh", { body: {} });
    expect(response.status).toBe(400);
    expect(error?.errors).toEqual([
      expect.objectContaining({ field: "refreshToken", code: "REQUIRED" }),
    ]);
  });
});

describe("POST /auth/logout", () => {
  it("answers 204, even for an unknown token", async () => {
    const { response } = await api.POST("/auth/logout", { body: { refreshToken: "unknown" } });
    expect(response.status).toBe(204);
  });

  it("answers 400 REQUIRED for an empty refresh token", async () => {
    const { response, error } = await api.POST("/auth/logout", { body: { refreshToken: "" } });
    expect(response.status).toBe(400);
    expect(error?.errors).toEqual([
      expect.objectContaining({ field: "refreshToken", code: "REQUIRED" }),
    ]);
  });
});

describe("mock fetch", () => {
  it("throws for a request no handler matches", async () => {
    await expect(api.GET("/products")).rejects.toThrow(
      "No mock handler for GET https://api.mock.invalid/api/v1/products"
    );
  });
});
