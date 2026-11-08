import { describe, expect, it } from "vitest";

import { emptyKind } from "@/features/products/empty-state";
import { formatDate, formatDateTime, formatPrice } from "@/features/products/format";

describe("formatPrice", () => {
  it.each([
    { locale: "en-GB", currency: "EUR", price: "€129.00" },
    // The space is a no-break space, so the amount and symbol never wrap apart.
    { locale: "de-DE", currency: "EUR", price: "129,00\u00a0€" },
    { locale: "nl-NL", currency: "EUR", price: "€\u00a0129,00" },
    { locale: "en-US", currency: "USD", price: "$129.00" },
    // Outside the US, US dollars keep their country, so they read apart from other dollars.
    { locale: "en-GB", currency: "USD", price: "US$129.00" },
  ])("shows $currency for $locale as $price", ({ locale, currency, price }) => {
    expect(formatPrice(12_900, currency, locale)).toBe(price);
  });
});

describe("formatDate", () => {
  it("uses the UTC day, whatever the server's time zone", () => {
    expect(formatDate("2026-10-20T23:59:59Z", "en-GB")).toBe("20 Oct 2026");
    expect(formatDate("2026-10-21T00:00:00Z", "en-GB")).toBe("21 Oct 2026");
  });

  it("follows the region's order", () => {
    expect(formatDate("2026-10-20T12:00:00Z", "en-US")).toBe("Oct 20, 2026");
    expect(formatDate("2026-10-20T12:00:00Z", "en-DE")).toBe("20 Oct 2026");
  });
});

describe("formatDateTime", () => {
  it("shows the UTC time and says so", () => {
    expect(formatDateTime("2026-10-20T16:02:11Z", "en-GB")).toBe("20 Oct 2026, 16:02 UTC");
    expect(formatDateTime("2026-10-20T09:02:11Z", "en-US")).toBe("Oct 20, 2026, 9:02 AM UTC");
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
