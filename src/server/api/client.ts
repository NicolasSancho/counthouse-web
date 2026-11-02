import "server-only";

import createClient, { type Client } from "openapi-fetch";

import type { paths } from "@/server/api/schema";
import { readApiConfig, type ApiConfig } from "@/server/env";
import { createMockFetch, MOCK_BASE_URL } from "@/server/mock/fetch";

export type ApiClient = Client<paths>;

/** Makes loading states visible in the demo. Tests pass 0. */
const MOCK_LATENCY_MS = 150;

export function createApiClient(
  config: ApiConfig,
  { mockLatencyMs = MOCK_LATENCY_MS }: { mockLatencyMs?: number } = {}
): ApiClient {
  if (config.mode === "live") return createClient<paths>({ baseUrl: config.baseUrl });
  return createClient<paths>({
    baseUrl: MOCK_BASE_URL,
    fetch: createMockFetch({ latencyMs: mockLatencyMs }),
  });
}

let client: ApiClient | undefined;

/**
 * The client for the configured mode, created on first use so a bad configuration fails on the
 * first API call rather than at boot. It holds no per-request state.
 */
export function getApiClient(): ApiClient {
  client ??= createApiClient(readApiConfig());
  return client;
}
