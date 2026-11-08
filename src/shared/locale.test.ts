import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { FALLBACK_LOCALE, formatLocales, pickLocale } from "@/shared/locale";

describe("pickLocale", () => {
  it.each([
    { header: "de-DE,de;q=0.9,en;q=0.8", locale: "de-DE" },
    { header: "en;q=0.5,fr-FR", locale: "fr-FR" },
    { header: "nl-NL;q=0.8,pl-PL;q=0.8", locale: "nl-NL" },
    { header: "pl-PL,pl;q=0.9,en-US;q=0.8", locale: "pl-PL" },
    { header: "de-DE;q=0,fr-FR;q=0.1", locale: "fr-FR" },
    { header: "*", locale: FALLBACK_LOCALE },
    { header: "en_US, *;q=0.5, sv-SE;q=0.4", locale: "sv-SE" },
    { header: "ar-EG,he-IL;q=0.9,fa-IR;q=0.8", locale: FALLBACK_LOCALE },
    { header: "ar-EG,es-ES;q=0.5", locale: "es-ES" },
    { header: "de-DE-u-nu-arab", locale: FALLBACK_LOCALE },
    { header: "de-de", locale: "de-DE" },
    { header: "", locale: FALLBACK_LOCALE },
    { header: null, locale: FALLBACK_LOCALE },
    { header: "de-DE;q=abc,it-IT;q=2", locale: FALLBACK_LOCALE },
  ])("reads $header as $locale", ({ header, locale }) => {
    expect(pickLocale(header)).toBe(locale);
  });
});

describe("formatLocales", () => {
  it.each([
    { header: "de-DE", numbers: "de-DE", dates: "en-DE" },
    { header: "en-US", numbers: "en-US", dates: "en-US" },
    { header: "nl", numbers: "nl", dates: "en-NL" },
    // Intl has no English data for Greece, and `en-GR` would read like US English.
    { header: "el-GR", numbers: "el-GR", dates: FALLBACK_LOCALE },
    { header: null, numbers: FALLBACK_LOCALE, dates: FALLBACK_LOCALE },
  ])("formats $header with $numbers numbers and $dates dates", ({ header, ...locales }) => {
    expect(formatLocales(header)).toEqual(locales);
  });
});

// Tags a browser sends, the ones this page must refuse among them, and malformed ones.
const TAGS = [
  "en-GB",
  "en-US",
  "en",
  "de-DE",
  "de-AT",
  "de-CH",
  "fr-FR",
  "fr-BE",
  "nl-NL",
  "nl-BE",
  "es-ES",
  "it-IT",
  "pt-PT",
  "pt-BR",
  "pl-PL",
  "sv-SE",
  "da-DK",
  "fi-FI",
  "nb-NO",
  "cs-CZ",
  "el-GR",
  "hu-HU",
  "ro-RO",
  "tr-TR",
  "ru-RU",
  "uk-UA",
  "ja-JP",
  "zh-CN",
  "ko-KR",
  "hi-IN",
  "th-TH",
  "ar-EG",
  "ar-SA",
  "he-IL",
  "fa-IR",
  "ur-PK",
  "bn-BD",
  "mr-IN",
  "my-MM",
  "ne-NP",
  "de-DE-u-nu-arab",
  "*",
  "en_US",
  "i-klingon",
  "xx-YY",
  "",
];
const header = fc
  .array(
    fc.record({
      tag: fc.oneof(fc.constantFrom(...TAGS), fc.string()),
      q: fc.option(fc.oneof(fc.double({ min: -1, max: 2 }), fc.string()), { nil: undefined }),
    })
  )
  .map((parts) =>
    parts.map(({ tag, q }) => (q === undefined ? tag : `${tag};q=${String(q)}`)).join(",")
  );

describe("any Accept-Language header", () => {
  it("never throws, and prices and dates come out with Latin digits and no direction marks", () => {
    fc.assert(
      fc.property(header, (value) => {
        const { numbers, dates } = formatLocales(value);
        const price = new Intl.NumberFormat(numbers, { style: "currency", currency: "EUR" }).format(
          1234.5
        );
        const date = new Intl.DateTimeFormat(dates, { dateStyle: "medium" }).format(0);
        const text = `${price} ${date}`;

        expect(text).not.toMatch(/[‎‏؜]/);
        // Every decimal digit of any script must be one of 0 to 9.
        expect(text.match(/\p{Nd}/gu)?.every((digit) => /[0-9]/.test(digit))).toBe(true);
      })
    );
  });
});
