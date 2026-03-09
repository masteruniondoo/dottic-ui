import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DOTTIC_CONTRACT_ADDRESS: process.env.DOTTIC_CONTRACT_ADDRESS,
  },
};

export default nextConfig;
