'use client'

import React, { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

interface MiniappUser {
  fid: number
  username: string
  displayName: string
  pfp: string
  followerCount: number
  followingCount: number
}

export const MiniappUserProfile: React.FC = () => {
  const [user, setUser] = useState<MiniappUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUserData = async () => {
      try {
        // Check if we're in a miniapp environment
        const isInMiniapp = await sdk.isInMiniApp()
        
        if (isInMiniapp) {
          console.log('In miniapp environment, trying to get user data...')
          
          // Try to get user data using quickAuth
          try {
            const token = await sdk.quickAuth.getToken()
            console.log('QuickAuth token:', token)
            
            if (token) {
              // Try to fetch user profile using the token
              const response = await sdk.quickAuth.fetch('https://api.farcaster.xyz/v2/me', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              
              if (response.ok) {
                const userData = await response.json()
                console.log('User data from API:', userData)
                
                if (userData.result && userData.result.user) {
                  const profile = userData.result.user
                  setUser({
                    fid: profile.fid,
                    username: profile.username || '',
                    displayName: profile.displayName || '',
                    pfp: profile.pfp || '',
                    followerCount: profile.followerCount || 0,
                    followingCount: profile.followingCount || 0
                  })
                  return
                }
              }
            }
          } catch (authError) {
            console.log('QuickAuth error:', authError)
          }
          
          // Fallback: show miniapp environment info
          setUser({
            fid: 0,
            username: 'miniapp_user',
            displayName: 'Miniapp User',
            pfp: 'https://picsum.photos/200',
            followerCount: 0,
            followingCount: 0
          })
        } else {
          console.log('Not in miniapp environment')
          setUser(null)
        }
      } catch (error) {
        console.error('Error loading miniapp user data:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    getUserData()
  }, [])

  if (isLoading) {
    return (
      <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30 mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
          <span className="ml-2 text-purple-300">Betöltés...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30 mb-6">
        <div className="text-center">
          <p className="text-purple-300 text-sm">Farcaster miniapp környezetben fut</p>
          <p className="text-gray-400 text-xs">Felhasználói adatok automatikusan elérhetők</p>
        </div>
      </div>
    )
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

        {/* Miniapp Badge */}
        <div className="text-right">
          <div className="text-sm text-green-400">✅ Miniapp</div>
          <div className="text-xs text-gray-400">Automatikus</div>
        </div>
      </div>
    </div>
  )
} 