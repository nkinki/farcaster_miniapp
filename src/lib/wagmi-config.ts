import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

// Centralized Wagmi configuration - ONLY Base mainnet for smart contracts
export const config = createConfig({
  chains: [base], // ONLY Base mainnet
  transports: {
    [base.id]: http('https://base.meowrpc.com', {
      // Base hálózat specifikus beállítások - Smart contracts
      batch: {
        batchSize: 1024,
        wait: 16,
      },
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  connectors: [
    miniAppConnector()
  ]
}) 