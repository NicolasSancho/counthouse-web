import "server-only";

import { getResponse } from "msw";

import { createAuthHandlers } from "@/server/mock/auth-handlers";

/** A host that cannot resolve (`.invalid`, RFC 2606), so a request that escapes the mock fails. */
export const MOCK_BASE_URL = "https://api.mock.invalid/api/v1";

const handlers = [...createAuthHandlers(MOCK_BASE_URL)];

/**
 * A `fetch` that answers from the MSW handlers inside this process. It is passed to the API client
 * only, so the global `fetch` is not patched. A request with no handler throws instead of reaching
 * the network.
 */
export function createMockFetch({ latencyMs }: { latencyMs: number }) {
  return async (request: Request): Promise<Response> => {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
    const response = await getResponse(handlers, request);
    if (!response) throw new Error(`No mock handler for ${request.method} ${request.url}`);
    return response;
  };
}
