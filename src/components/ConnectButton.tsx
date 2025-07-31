"use client"

import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { FiUser } from 'react-icons/fi'

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfp?: string;
}

interface FarcasterContext {
  user?: FarcasterUser;
}

export default function ConnectButton() {
  const [isConnected, setIsConnected] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Get Farcaster user context
    sdk.context.then((ctx: FarcasterContext) => {
      const farcasterUser = ctx.user
      console.log('Farcaster user context in ConnectButton:', farcasterUser)
      
      if (farcasterUser?.fid) {
        setIsConnected(true)
        console.log('User connected in ConnectButton:', farcasterUser)
      } else {
        setIsConnected(false)
      }
    }).catch((error) => {
      console.error('Error getting Farcaster context in ConnectButton:', error)
      setIsConnected(false)
    })
  }, [])

  const signIn = async () => {
    console.log('Sign in - this would open Farcaster auth in mini app environment')
    setIsPolling(true)
    setIsError(false)
    
    try {
      // In Farcaster environment, this would trigger the native auth flow
      await sdk.actions.ready()
      setIsConnected(true)
      setIsPolling(false)
    } catch (error) {
      console.error('Sign in error:', error)
      setIsError(true)
      setError(error instanceof Error ? error : new Error('Unknown error'))
      setIsPolling(false)
    }
  }

  if (isConnected) {
    return null // Don't show connect button if already connected
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => {
          console.log('Sign in button clicked')
          signIn()
        }}
        disabled={isPolling}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
      >
        <FiUser size={20} />
        {isPolling ? 'Connecting...' : 'Connect Farcaster'}
      </button>
      {isError && (
        <div className="text-red-400 text-sm">
          Error: {error?.message || 'Unknown error'}
        </div>
      )}
      {isPolling && (
        <div className="text-blue-400 text-sm">
          Waiting for QR code scan...
        </div>
      )}
    </div>
  )
}