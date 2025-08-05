import { createConfig, http } from "wagmi"
import { base } from "wagmi/chains"
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector"
import { injected, walletConnect } from "wagmi/connectors"

// A createConnectors segédfüggvény változatlan
const createConnectors = () => {
  const connectors = []
  try {
    const farcasterConnector = miniAppConnector()
    if (farcasterConnector && typeof farcasterConnector === 'object') {
      connectors.push(farcasterConnector)
      console.log('✅ Farcaster MiniApp connector loaded successfully')
    }
  } catch (error) {
    console.warn('⚠️ Farcaster MiniApp connector failed to load:', error)
  }
  try {
    connectors.push(injected({ shimDisconnect: true }))
    console.log('✅ Injected connector loaded successfully')
  } catch (error) {
    console.warn('⚠️ Injected connector failed to load:', error)
  }
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

// Itt olvassuk be a saját Alchemy URL-ünket a környezeti változóból.
const alchemyRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;

// Hozzáadunk egy biztonsági ellenőrzést, ami jelez, ha a változó hiányzik.
if (!alchemyRpcUrl) {
  throw new Error("Kritikus hiba: Az NEXT_PUBLIC_ALCHEMY_URL környezeti változó nincs beállítva!");
}

export const config = createConfig({
  chains: [base],
  transports: {
    // A régi "mainnet.base.org"-ot lecseréljük a saját Alchemy URL-ünkre.
    [base.id]: http(alchemyRpcUrl),
  },
  connectors: createConnectors(),
  ssr: false,
  syncConnectedChain: true,
})

// Export chain info for easy access
export const supportedChain = base
export const isValidChain = (chainId: number) => chainId === base.id