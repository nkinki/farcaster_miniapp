import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

// Centralized Wagmi configuration - ONLY Base mainnet for smart contracts
export const config = createConfig({
  chains: [base], // ONLY Base mainnet
  transports: {
    [base.id]: http('https://mainnet.base.org', {
      // Base hálózat specifikus beállítások - Smart contracts
      batch: {
        batchSize: 512,
        wait: 32,
      },
      retryCount: 5,
      retryDelay: 2000,
    }),
  },
  connectors: [
    miniAppConnector()
  ]
}) 