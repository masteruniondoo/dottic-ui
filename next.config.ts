import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DOTTIC_CONTRACT_ADDRESS: process.env.DOTTIC_CONTRACT_ADDRESS,
    NEXT_PUBLIC_POLKADOT_HUB_RPC_URL: process.env.RPC_URL,
  },
};

export default nextConfig;
