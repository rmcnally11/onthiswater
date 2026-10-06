import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
