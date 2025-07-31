"use client"

import { useSignIn } from '@farcaster/auth-kit'
import { FiUser } from 'react-icons/fi'

export default function ConnectButton() {
  const { signIn, isConnected, isError, error, isPolling } = useSignIn({
    onSuccess: (data) => {
      console.log('Sign in successful:', data)
    },
    onError: (error) => {
      console.error('Sign in error:', error)
    }
  })

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
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
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