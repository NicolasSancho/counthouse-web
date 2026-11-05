import "server-only";

import { getApiClient } from "@/server/api/client";

/** Every request of a page waits for the refresh, so an API that hangs must not hold them long. */
const REFRESH_TIMEOUT_MS = 3000;

export type RefreshResult =
  | { outcome: "refreshed"; accessToken: string; expiresIn: number }
  | { outcome: "refused" }
  | { outcome: "unavailable" };

/**
 * Asks the API for a new access token. Apart from `src/server/auth.ts`, so the proxy does not bundle
 * React `cache` and `next/navigation`. `refused` means the refresh token is no good; `unavailable`
 * says nothing about the token, so the session must survive it.
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  try {
    const { data, response } = await getApiClient().POST("/auth/refresh", {
      body: { refreshToken },
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
    if (data) {
      return { outcome: "refreshed", accessToken: data.accessToken, expiresIn: data.expiresIn };
    }
    if (response.status === 401) return { outcome: "refused" };
    console.error(`Refreshing the token answered ${response.status}.`);
    // The API rejected the token as malformed. Retrying cannot help, so the session ends here too,
    // and the log shows it if the cause is a mismatch with the contract.
    if (response.status === 400) return { outcome: "refused" };
  } catch (cause) {
    console.error("Refreshing the token failed.", cause);
  }
  return { outcome: "unavailable" };
}
