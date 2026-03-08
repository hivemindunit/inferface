import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @inferface packages use "use client" directive — no special config needed
  transpilePackages: ["@inferface/hooks", "@inferface/components"],
};

export default nextConfig;
