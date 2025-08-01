import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

// Centralized Wagmi configuration - ONLY Base mainnet for smart contracts
export const config = createConfig({
  chains: [base], // ONLY Base mainnet
  transports: {
    [base.id]: http('https://mainnet.base.org', {
      // Primary Base RPC endpoint
      batch: {
        batchSize: 512,
        wait: 32,
      },
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  connectors: [
    miniAppConnector()
  ]
}) 