'use client'

import React from 'react'
import { useFarcasterAuth } from './FarcasterAuthProvider'

export const UserProfile: React.FC = () => {
  const { user, isAuthenticated } = useFarcasterAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30 mb-6">
      <div className="flex items-center gap-4">
        {/* Profile Picture */}
        <div className="relative">
          <img
            src={user.pfp}
            alt={user.displayName}
            className="w-16 h-16 rounded-full border-4 border-purple-400 shadow-lg"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
            }}
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-black flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">{user.displayName}</h2>
          <p className="text-purple-300 text-sm mb-2">@{user.username}</p>
          
          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-cyan-400">👥</span>
              <span className="text-white font-semibold">{user.followerCount.toLocaleString()}</span>
              <span className="text-gray-400">követő</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-purple-400">👤</span>
              <span className="text-white font-semibold">{user.followingCount.toLocaleString()}</span>
              <span className="text-gray-400">követett</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">🏆</span>
              <span className="text-white font-semibold">#{user.fid}</span>
              <span className="text-gray-400">FID</span>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="text-right">
          <div className="text-sm text-purple-300">Üdvözöljük!</div>
          <div className="text-xs text-gray-400">Farcaster Miniapp Rankings</div>
        </div>
      </div>
    </div>
  )
} 