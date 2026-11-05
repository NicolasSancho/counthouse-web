import { beforeEach, describe, expect, it, vi } from "vitest";

import { brandFor, readBrand } from "@/server/brand";
import { readBrandCookie } from "@/server/session";

vi.mock("@/server/session", () => ({ readBrandCookie: vi.fn() }));

describe("brandFor", () => {
  it("finds the preset of a known color, in either case", () => {
    expect(brandFor({ primary: "#1f5f4a" })).toBe("northwind");
    expect(brandFor({ primary: "#1F5F4A" })).toBe("northwind");
  });

  it("has no preset for an unknown or absent color", () => {
    expect(brandFor({ primary: "#123456" })).toBeUndefined();
    expect(brandFor({})).toBeUndefined();
    expect(brandFor(undefined)).toBeUndefined();
  });
});

describe("readBrand", () => {
  beforeEach(() => {
    vi.mocked(readBrandCookie).mockReset();
  });

  it("returns a known preset", async () => {
    vi.mocked(readBrandCookie).mockResolvedValue("northwind");
    await expect(readBrand()).resolves.toBe("northwind");
  });

  it("ignores anything else in the cookie", async () => {
    vi.mocked(readBrandCookie).mockResolvedValue('x"><script>');
    await expect(readBrand()).resolves.toBeUndefined();
  });

  it("has no brand without the cookie", async () => {
    vi.mocked(readBrandCookie).mockResolvedValue(undefined);
    await expect(readBrand()).resolves.toBeUndefined();
  });
});
