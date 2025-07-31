"use client"

import { AuthKitProvider } from '@farcaster/auth-kit'
import { ReactNode } from 'react'

interface ClientAuthProviderProps {
  children: ReactNode;
}

export default function ClientAuthProvider({ children }: ClientAuthProviderProps) {
  return (
    <AuthKitProvider config={{ 
      domain: 'localhost',
      relay: 'https://relay.farcaster.xyz'
    }}>
      {children}
    </AuthKitProvider>
  )
} 