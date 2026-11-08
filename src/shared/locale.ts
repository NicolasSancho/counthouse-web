/** The locales a page formats with: the reader's for numbers, English with their region for dates. */
export interface FormatLocales {
  numbers: string;
  dates: string;
}

export const FALLBACK_LOCALE = "en-GB";

/** Enough for any real browser; a longer header is cut, not parsed in full. */
const MAX_TAGS = 20;

/** `Intl.Locale#getTextInfo()` is in V8 but not yet in TypeScript's lib. */
type WithTextInfo = Intl.Locale & { getTextInfo?: () => { direction?: string } };

/**
 * A locale this English page can format with: one `Intl` knows, that writes Latin digits and reads
 * left to right. Arabic digits or right-to-left marks would land in the middle of English text.
 */
function usable(tag: string): string | undefined {
  let locale: string | undefined;
  try {
    locale = Intl.getCanonicalLocales(tag)[0];
  } catch {
    return undefined; // `*`, `en_US` and other tags that are not BCP 47.
  }
  if (!locale || Intl.NumberFormat.supportedLocalesOf([locale]).length === 0) return undefined;
  if (new Intl.NumberFormat(locale).resolvedOptions().numberingSystem !== "latn") return undefined;
  const direction = (new Intl.Locale(locale) as WithTextInfo).getTextInfo?.().direction;
  return direction === "rtl" ? undefined : locale;
}

/**
 * The reader's locale from an `Accept-Language` header: the most preferred usable tag, in the
 * header's order for equal weights, or en-GB.
 */
export function pickLocale(header: string | null): string {
  const tags = (header ?? "")
    .split(",")
    .slice(0, MAX_TAGS)
    .map((part) => {
      const [tag = "", ...params] = part.split(";").map((piece) => piece.trim());
      const q = params.find((param) => param.startsWith("q="));
      return { tag, weight: q === undefined ? 1 : Number(q.slice(2)) };
    })
    .filter(({ tag, weight }) => tag !== "" && weight > 0 && weight <= 1)
    // `toSorted` is stable, so equal weights keep the header's order.
    .toSorted((a, b) => b.weight - a.weight);

  for (const { tag } of tags) {
    const locale = usable(tag);
    if (locale) return locale;
  }
  return FALLBACK_LOCALE;
}

/**
 * Both locales for a header. Dates are English, with the reader's region where `Intl` has English
 * data for it (en-DE, en-US); otherwise en-GB, since `en-GR` would fall back to US order.
 */
export function formatLocales(header: string | null): FormatLocales {
  const numbers = pickLocale(header);
  const region = new Intl.Locale(numbers).maximize().region;
  const english = region ? new Intl.Locale("en", { region }).toString() : FALLBACK_LOCALE;
  const resolved = new Intl.DateTimeFormat(english).resolvedOptions().locale;
  return { numbers, dates: resolved === english ? english : FALLBACK_LOCALE };
}
