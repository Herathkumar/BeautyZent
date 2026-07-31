import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@zentralab/shared", "@zentralab/sync"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
