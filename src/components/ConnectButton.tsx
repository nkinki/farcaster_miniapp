"use client"

import { useFarcasterAccount } from '@farcaster/auth-kit'
import { FiUser } from 'react-icons/fi'

export default function ConnectButton() {
  const { isConnected, signIn } = useFarcasterAccount()

  if (isConnected) {
    return null // Don't show connect button if already connected
  }

  return (
    <button
      onClick={signIn}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <FiUser size={20} />
      Connect Farcaster
    </button>
  )
}