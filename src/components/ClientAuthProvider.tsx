"use client"

import { AuthKitProvider } from '@farcaster/auth-kit'
import { ReactNode } from 'react'

interface ClientAuthProviderProps {
  children: ReactNode;
}

export default function ClientAuthProvider({ children }: ClientAuthProviderProps) {
  return (
    <AuthKitProvider config={{ 
      domain: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
      relay: 'https://relay.farcaster.xyz',
      rpcUrl: 'https://ethereum.publicnode.com',
      siweUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    }}>
      {children}
    </AuthKitProvider>
  )
} 