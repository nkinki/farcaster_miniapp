import { createConfig, http } from "wagmi"
import { base } from "wagmi/chains"
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector"
import { injected, walletConnect } from "wagmi/connectors"

// Helper function to create connectors with error handling
const createConnectors = () => {
  const connectors = []
  
  // Try to add Farcaster MiniApp connector with error handling
  try {
    const farcasterConnector = miniAppConnector()
    // Add additional properties to ensure compatibility
    if (farcasterConnector && typeof farcasterConnector === 'object') {
      connectors.push(farcasterConnector)
      console.log('✅ Farcaster MiniApp connector loaded successfully')
    }
  } catch (error) {
    console.warn('⚠️ Farcaster MiniApp connector failed to load:', error)
  }
  
  // Always add injected connector as fallback
  try {
    connectors.push(injected({
      shimDisconnect: true,
    }))
    console.log('✅ Injected connector loaded successfully')
  } catch (error) {
    console.warn('⚠️ Injected connector failed to load:', error)
  }
  
  // Add WalletConnect if project ID is available
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  if (projectId && projectId.trim() !== "") {
    try {
      connectors.push(walletConnect({
        projectId,
        metadata: {
          name: 'Farcaster MiniApp',
          description: 'Farcaster promotion campaigns',
          url: 'https://apprank.xyz',
          icons: ['https://apprank.xyz/icon.png']
        }
      }))
      console.log('✅ WalletConnect connector loaded successfully')
    } catch (error) {
      console.warn('⚠️ WalletConnect connector failed to load:', error)
    }
  }
  
  return connectors
}

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
  connectors: createConnectors(),
  // Add additional configuration for better compatibility
  ssr: false,
  syncConnectedChain: true,
})

// Export chain info for easy access
export const supportedChain = base
export const isValidChain = (chainId: number) => chainId === base.id
