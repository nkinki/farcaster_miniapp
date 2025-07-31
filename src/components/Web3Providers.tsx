"use client"

import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { AuthKitProvider } from '@farcaster/auth-kit'

const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: '34357d3c125c2bcf2ce2bc3309d98715' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
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
          domain: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
          relay: 'https://relay.farcaster.xyz'
        }}>
          {children}
        </AuthKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 