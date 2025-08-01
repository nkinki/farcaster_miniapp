"use client"

import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { AuthKitProvider } from '@farcaster/auth-kit'

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
  connectors: [
    miniAppConnector()
  ]
})

const queryClient = new QueryClient()

interface Web3ProvidersProps {
  children: ReactNode;
}

export default function Web3Providers({ children }: Web3ProvidersProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthKitProvider config={{ 
          domain: 'apprank.xyz',
          relay: 'https://relay.farcaster.xyz',
          rpcUrl: 'https://mainnet.optimism.io',
          siweUri: 'https://apprank.xyz'
        }}>
          {children}
        </AuthKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 