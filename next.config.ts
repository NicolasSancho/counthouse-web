import type { NextConfig } from "next";

/**
 * Only the directives that do not depend on how a page renders. Without `default-src`, this leaves
 * scripts, styles and connections unrestricted: a policy for those is a separate decision.
 */
const contentSecurityPolicy = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'";

const nextConfig: NextConfig = {
  headers: () =>
    Promise.resolve([
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }],
      },
    ]),
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
