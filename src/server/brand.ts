import "server-only";

import type { ThemeSeed } from "@/server/api/schema";
import { readBrandCookie } from "@/server/session";

/** The tenant colors with a preset in src/app/globals.css, in lower case. */
const PRESETS: Readonly<Record<string, string>> = { "#1f5f4a": "northwind" };

/** The preset for a tenant's theme. An unknown or absent color gets the default brand. */
export function brandFor(theme: ThemeSeed | undefined): string | undefined {
  return theme?.primary ? PRESETS[theme.primary.toLowerCase()] : undefined;
}

/** The brand of this session. A cookie holding anything but a known preset counts as none. */
export async function readBrand(): Promise<string | undefined> {
  const value = await readBrandCookie();
  return value && Object.values(PRESETS).includes(value) ? value : undefined;
}
