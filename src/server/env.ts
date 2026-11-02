import "server-only";

/** How the server reaches the API. Set per deployment; there is no fallback between modes. */
export type ApiConfig = { mode: "mock" } | { mode: "live"; baseUrl: string };

type Env = Record<string, string | undefined>;

/**
 * Reads `API_MODE` (`mock` when unset) and, in live mode, `API_BASE_URL`. Throws a message that
 * names the variable, so a misconfigured deployment fails on its first API call. A base URL
 * without live mode is an error too: a deployment meant for the real API must not quietly serve
 * the demo.
 */
export function parseApiConfig(env: Env): ApiConfig {
  const mode = env.API_MODE || "mock";
  if (mode === "mock") {
    if (env.API_BASE_URL) {
      throw new Error(
        'API_BASE_URL is set but API_MODE is not "live". Set API_MODE=live or remove it.'
      );
    }
    return { mode };
  }
  if (mode !== "live") {
    throw new Error(`API_MODE must be "mock" or "live", got "${mode}".`);
  }

  const baseUrl = env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error('API_BASE_URL is required when API_MODE is "live".');
  }
  if (!/^https?:$/.test(URL.parse(baseUrl)?.protocol ?? "")) {
    throw new Error(`API_BASE_URL must be an http or https URL, got "${baseUrl}".`);
  }
  return { mode, baseUrl };
}

export function readApiConfig(): ApiConfig {
  return parseApiConfig(process.env);
}
