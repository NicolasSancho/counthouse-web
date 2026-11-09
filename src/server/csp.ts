/**
 * Directives that do not depend on how a page renders. `next.config.ts` sends them on every path,
 * including the ones the proxy skips (build assets, files with an extension).
 */
export const BASE_POLICY = "object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

/**
 * The policy for pages, which the proxy sends with a fresh nonce on every request (ADR 0010). Next
 * puts the nonce on the scripts it renders, and `'strict-dynamic'` lets those scripts load the
 * chunks they need. Any other script does not run.
 */
export function pagePolicy(nonce: string): string {
  return `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; ${BASE_POLICY}`;
}
