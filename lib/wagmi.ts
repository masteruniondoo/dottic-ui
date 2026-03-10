import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

const POLKADOT_HUB_MAINNET_RPC_URL = process.env.NEXT_PUBLIC_POLKADOT_HUB_RPC_URL ?? 'https://eth-rpc.polkadot.io'

export const polkadotHub = defineChain({
  id: 420420419,
  name: 'Polkadot Hub',
  network: 'polkadot-hub',
  nativeCurrency: {
    name: 'DOT',
    symbol: 'DOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [POLKADOT_HUB_MAINNET_RPC_URL],
    },
  },
})

export const config = createConfig({
  chains: [polkadotHub],
  connectors: [injected()],
  transports: {
    [polkadotHub.id]: http(POLKADOT_HUB_MAINNET_RPC_URL),
  },
  ssr: true,
})
