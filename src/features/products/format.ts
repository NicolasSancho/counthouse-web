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

/** A date and time in UTC, labelled as such, for when a product last changed. */
export function formatDateTime(iso: string): string {
  // `dateStyle` cannot be combined with `timeZoneName`, so the parts are named one by one.
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
}
