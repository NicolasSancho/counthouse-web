import { describe, expect, it } from "vitest";

import { emptyKind } from "@/features/products/empty-state";
import { formatDate, formatDateTime, formatPrice } from "@/features/products/format";

describe("formatPrice", () => {
  it("shows cents in the tenant's currency", () => {
    expect(formatPrice(12_900, "EUR")).toBe("€129.00");
    expect(formatPrice(5, "USD")).toBe("US$0.05");
  });
});

describe("formatDate", () => {
  it("uses the UTC day, whatever the server's time zone", () => {
    expect(formatDate("2026-10-20T23:59:59Z")).toBe("20 Oct 2026");
    expect(formatDate("2026-10-21T00:00:00Z")).toBe("21 Oct 2026");
  });
});

describe("formatDateTime", () => {
  it("shows the UTC time and says so", () => {
    expect(formatDateTime("2026-10-20T16:02:11Z")).toBe("20 Oct 2026, 16:02 UTC");
  });
});

describe("emptyKind", () => {
  it("tells a tenant with no products from a search with no results", () => {
    expect(emptyKind({ q: "", page: 1 })).toBe("no-products");
    expect(emptyKind({ q: "boot", page: 1 })).toBe("no-results");
    expect(emptyKind({ q: "", status: "ARCHIVED", page: 1 })).toBe("no-results");
  });

  it("says a page is past the end before anything else", () => {
    expect(emptyKind({ q: "boot", page: 9 })).toBe("past-the-end");
  });
});
