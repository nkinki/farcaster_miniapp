"use client"

import { AuthKitProvider } from '@farcaster/auth-kit'
import { ReactNode } from 'react'

interface ClientAuthProviderProps {
  children: ReactNode;
}

export default function ClientAuthProvider({ children }: ClientAuthProviderProps) {
  return (
    <AuthKitProvider config={{ domain: 'apprank.xyz' }}>
      {children}
    </AuthKitProvider>
  )
} 