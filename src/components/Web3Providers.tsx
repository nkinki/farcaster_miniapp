"use client"

import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi-config'
import { AuthKitProvider } from '@farcaster/auth-kit'

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