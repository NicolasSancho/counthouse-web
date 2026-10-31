import { describe, expect, it } from "vitest";

import { isCurrentPath } from "./is-current-path";

describe("isCurrentPath", () => {
  it("matches the page itself", () => {
    expect(isCurrentPath("/products", "/products")).toBe(true);
  });

  it("matches a page below it", () => {
    expect(isCurrentPath("/products/42/edit", "/products")).toBe(true);
  });

  it("does not match a sibling that shares the prefix", () => {
    expect(isCurrentPath("/products-archive", "/products")).toBe(false);
  });

  it("does not match a parent or another page", () => {
    expect(isCurrentPath("/", "/products")).toBe(false);
    expect(isCurrentPath("/settings", "/products")).toBe(false);
  });
});
