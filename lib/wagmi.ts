import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  network: 'polkadot-hub-testnet',
  nativeCurrency: {
    name: 'Paseo',
    symbol: 'PAS',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://services.polkadothub-rpc.com/testnet/'],
    },
  },
})

export const config = createConfig({
  chains: [polkadotHubTestnet],
  connectors: [injected()],
  transports: {
    [polkadotHubTestnet.id]: http('https://services.polkadothub-rpc.com/testnet/'),
  },
  ssr: true,
})
