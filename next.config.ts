import type { NextConfig } from "next";

/**
 * One deploy-build timestamp for sitemap entries that have no per-entry
 * content date. `env` inlines this into the server bundle at `next build`,
 * so hourly sitemap regeneration does not call new Date() per entry.
 * This is not a Vercel project environment variable.
 */
const SITE_BUILD_TIME = new Date().toISOString();

const nextConfig: NextConfig = {
  env: {
    SITE_BUILD_TIME,
  },
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "private, no-store" }];
    return [
      { source: "/card", headers: noStore },
      { source: "/api/tweets", headers: noStore },
      { source: "/api/briefing", headers: noStore },
    ];
  },
};

export default nextConfig;
