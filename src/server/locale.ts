import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { formatLocales, type FormatLocales } from "@/shared/locale";

/**
 * The locales of this request's reader, from `Accept-Language`. Read once per request. Call it
 * inside a `Suspense` boundary, after the data: it is request data.
 */
export const getFormatLocales = cache(async (): Promise<FormatLocales> =>
  formatLocales((await headers()).get("accept-language"))
);
