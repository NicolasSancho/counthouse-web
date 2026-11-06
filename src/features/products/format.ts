const LOCALE = "en-GB";

/** A price in the tenant's currency. The contract's currencies all have two decimals. */
export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(cents / 100);
}

/** A date in UTC, so every user and the server show the same day. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(iso)
  );
}
