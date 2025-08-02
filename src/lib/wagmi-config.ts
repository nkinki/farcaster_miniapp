import { createConfig, http } from "wagmi"
import { base } from "wagmi/chains"
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector"
import { injected, walletConnect } from "wagmi/connectors" // Hozzáadva az injected és walletConnect csatlakozók

// Centralizált Wagmi konfiguráció - CSAK Base mainnet az okosszerződésekhez
export const config = createConfig({
  chains: [base], // CSAK Base mainnet
  transports: {
    [base.id]: http("https://mainnet.base.org", {
      // Elsődleges Base RPC végpont
      batch: {
        batchSize: 512,
        wait: 32,
      },
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  connectors: [
    miniAppConnector(), // Farcaster Mini App csatlakozó
    injected(), // Általános injektált pénztárcákhoz (pl. MetaMask)
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "" }), // WalletConnect csatlakozó
  ],
})
