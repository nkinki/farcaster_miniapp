import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

// Centralized Wagmi configuration - ONLY Base mainnet
export const config = createConfig({
  chains: [base], // ONLY Base mainnet, no other networks
  transports: {
    [base.id]: http('https://mainnet.base.org', {
      // Base hálózat specifikus beállítások
      batch: {
        batchSize: 1024,
        wait: 16,
      },
    }),
  },
  connectors: [
    miniAppConnector()
  ],
}) 