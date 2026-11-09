import type { NextConfig } from "next";

import { BASE_POLICY } from "./src/server/csp";

const nextConfig: NextConfig = {
  headers: () =>
    Promise.resolve([
      {
        source: "/:path*",
        // The proxy replaces this with the page policy on the paths it handles (src/proxy.ts).
        headers: [{ key: "Content-Security-Policy", value: BASE_POLICY }],
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
