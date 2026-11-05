import { describe, expect, it } from "vitest";

import { accessCookie, unwrapAccessToken } from "@/server/session";

describe("the access cookie", () => {
  const { value, maxAge } = accessCookie("access", 900, "refresh");

  it("expires 30 seconds before the token", () => {
    expect(maxAge).toBe(870);
  });

  it("gives the token back with the refresh token it was written with", () => {
    expect(unwrapAccessToken(value, "refresh")).toBe("access");
  });

  it.each([
    ["another refresh token", value, "other-refresh"],
    ["no refresh token", value, undefined],
    ["no fingerprint", "access", "refresh"],
    ["an empty value", "", "refresh"],
    ["no token after the fingerprint", accessCookie("", 900, "refresh").value, "refresh"],
  ])("gives nothing back with %s", (_, cookie, refreshToken) => {
    expect(unwrapAccessToken(cookie, refreshToken)).toBeUndefined();
  });
});
