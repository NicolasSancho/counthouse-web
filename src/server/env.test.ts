import { describe, expect, it } from "vitest";

import { parseApiConfig } from "@/server/env";

describe("parseApiConfig", () => {
  it("defaults to mock mode when API_MODE is unset", () => {
    expect(parseApiConfig({})).toEqual({ mode: "mock" });
  });

  it.each([{}, { API_MODE: "mock" }])(
    "throws when a base URL is set without live mode: %o",
    (mode) => {
      expect(() =>
        parseApiConfig({ ...mode, API_BASE_URL: "https://api.counthouse.example" })
      ).toThrow('API_BASE_URL is set but API_MODE is not "live"');
    }
  );

  it("reads the base URL in live mode", () => {
    expect(
      parseApiConfig({ API_MODE: "live", API_BASE_URL: "http://localhost:8080/api/v1" })
    ).toEqual({ mode: "live", baseUrl: "http://localhost:8080/api/v1" });
  });

  it("throws in live mode without a base URL", () => {
    expect(() => parseApiConfig({ API_MODE: "live" })).toThrow("API_BASE_URL is required");
  });

  it("throws in live mode when the base URL is not an http URL", () => {
    expect(() => parseApiConfig({ API_MODE: "live", API_BASE_URL: "localhost:8080" })).toThrow(
      "API_BASE_URL must be an http or https URL"
    );
  });

  it("throws on an unknown mode", () => {
    expect(() => parseApiConfig({ API_MODE: "staging" })).toThrow(
      'API_MODE must be "mock" or "live", got "staging"'
    );
  });
});
