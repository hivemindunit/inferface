import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@inferface/hooks", "@inferface/components"],
};

export default nextConfig;
