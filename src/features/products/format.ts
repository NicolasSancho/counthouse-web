/** A price in the tenant's currency, in the reader's number format. Currencies have two decimals. */
export function formatPrice(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

/** A date in UTC, so every reader and the server show the same day. */
export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(iso)
  );
}

/**
 * A date and time in UTC, labelled as such: the server does not know the reader's time zone.
 * `hour: "numeric"` keeps a 12-hour clock unpadded ("9:02 AM") and a 24-hour one padded ("09:02").
 */
export function formatDateTime(iso: string, locale: string): string {
  // `dateStyle` cannot be combined with `timeZoneName`, so the parts are named one by one.
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
}
