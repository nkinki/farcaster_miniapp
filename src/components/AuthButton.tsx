'use client'

import React from 'react'
import { useFarcasterAuth } from './FarcasterAuthProvider'

export const AuthButton: React.FC = () => {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useFarcasterAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center px-4 py-2 bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        {/* User Profile */}
        <div className="flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30">
          <img
            src={user.pfp}
            alt={user.displayName}
            className="w-8 h-8 rounded-full border-2 border-purple-400"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
            }}
          />
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-white">{user.displayName}</div>
            <div className="text-xs text-purple-300">@{user.username}</div>
          </div>
        </div>
        
        {/* Sign Out Button */}
        <button
          onClick={signOut}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-semibold text-sm"
        >
          Kijelentkezés
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={signIn}
      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl"
    >
      🔐 Valódi Farcaster Bejelentkezés
    </button>
  )
} 