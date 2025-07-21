'use client'

import React, { createContext, useContext } from 'react'
import { AuthKitProvider, useSignIn, QRCode } from '@farcaster/auth-kit'

interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfp: string
  followerCount: number
  followingCount: number
}

interface AuthContextType {
  user: FarcasterUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// SignInButton component using AuthKit useSignIn
export function SignInButton() {
  const {
    signIn,
    url,
    data,
    isSuccess,
    isConnected,
    isPolling,
    isError,
    error,
  } = useSignIn({
    onSuccess: ({ fid }) => console.log('Your fid:', fid),
  });

  return (
    <div>
      <button onClick={signIn} disabled={isPolling} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold">
        {isPolling ? 'Bejelentkezés folyamatban...' : 'Bejelentkezés Farcasterrel'}
      </button>
      {url && (
        <div className="mt-2">
          <span>Scan this: <QRCode uri={url} /></span>
        </div>
      )}
      {data?.username && <div className="mt-2">Hello, {data.username}!</div>}
      {isError && <div className="text-red-500">Hiba: {error?.message}</div>}
    </div>
  );
}

export const useFarcasterAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useFarcasterAuth must be used within a FarcasterAuthProvider')
  }
  return context
}

interface FarcasterAuthProviderProps {
  children: React.ReactNode
}

// Farcaster AuthKit configuration
const config = {
  relay: 'https://relay.farcaster.xyz',
  version: 'v1',
  appName: 'APPRANK - Farcaster Miniapp Rankings',
  appIcon: 'https://apprank.vercel.app/og-image.png',
  appUrl: 'https://apprank.vercel.app',
  rpcUrl: 'https://mainnet.optimism.io',
  siweUri: 'https://apprank.vercel.app',
  domain: 'apprank.vercel.app'
}

function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const {
    data: signInData,
    isSuccess,
    isPolling,
    signIn: signInRaw,
    signOut: signOutRaw,
    isError,
    error,
  } = useSignIn({});

  const user = isSuccess && signInData && signInData.fid !== undefined ? {
    fid: signInData.fid ?? 0,
    username: signInData.username ?? '',
    displayName: signInData.displayName ?? '',
    pfp: signInData.pfpUrl ?? '',
    followerCount: 0, // Optionally fetch real follower data elsewhere
    followingCount: 0,
  } : null;

  // Wrap signIn and signOut to return Promise<void> for context compatibility
  const signIn = async () => { signInRaw(); };
  const signOut = async () => { signOutRaw(); };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading: isPolling,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const FarcasterAuthProvider: React.FC<FarcasterAuthProviderProps> = ({ children }) => {
  return (
    <AuthKitProvider config={config}>
      <AuthProviderContent>
        {children}
      </AuthProviderContent>
    </AuthKitProvider>
  )
} 