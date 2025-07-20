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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getUserData = async () => {
      try {
        // Check if we're in a miniapp environment
        const isInMiniapp = await sdk.isInMiniApp()
        console.log('Is in miniapp:', isInMiniapp)
        
        if (isInMiniapp) {
          console.log('In miniapp environment, trying to get user data...')
          
          // Try to get user data using quickAuth
          try {
            const token = await sdk.quickAuth.getToken()
            console.log('QuickAuth token received:', !!token)
            
            if (token) {
              console.log('Token received:', typeof token)
              
              // First, try to get user data from context
              console.log('Checking miniapp context...')
              const context = await sdk.context
              console.log('Context keys:', Object.keys(context || {}))
              console.log('Full context:', context)
              
              // Try to get user data from context first
              if (context && context.user) {
                console.log('Found user in context:', context.user)
                const profile = context.user
                setUser({
                  fid: profile.fid || 0,
                  username: profile.username || '',
                  displayName: profile.displayName || '',
                  pfp: profile.pfpUrl || '',
                  followerCount: 0, // Not available in UserContext
                  followingCount: 0  // Not available in UserContext
                })
                setError(null)
                return
              }
              
              // If no user in context, try API calls
              console.log('No user in context, trying API calls...')
              
              // Try multiple API endpoints
              const endpoints = [
                'https://api.farcaster.xyz/v1/user',
                'https://api.farcaster.xyz/v2/me',
                'https://api.farcaster.xyz/v1/me'
              ]
              
              let userData = null
              let successfulEndpoint = null
              
              for (const endpoint of endpoints) {
                try {
                  console.log(`Trying endpoint: ${endpoint}`)
                  const response = await sdk.quickAuth.fetch(endpoint, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  })
                  
                  console.log(`Endpoint ${endpoint} - status:`, response.status)
                  
                  if (response.ok) {
                    userData = await response.json()
                    successfulEndpoint = endpoint
                    console.log(`Success with endpoint: ${endpoint}`)
                    console.log('API Response:', JSON.stringify(userData, null, 2))
                    break
                  } else {
                    const errorText = await response.text()
                    console.log(`Endpoint ${endpoint} failed:`, response.status, errorText)
                  }
                } catch (endpointError) {
                  console.log(`Endpoint ${endpoint} error:`, endpointError)
                }
              }
              
              if (userData) {
                // Try different response formats
                let profile = null
                
                if (userData.result && userData.result.user) {
                  profile = userData.result.user
                } else if (userData.user) {
                  profile = userData.user
                } else if (userData.data && userData.data.user) {
                  profile = userData.data.user
                } else if (userData.fid) {
                  // Direct user object
                  profile = userData
                } else if (userData.result && userData.result.fid) {
                  // Direct result object
                  profile = userData.result
                }
                
                if (profile) {
                  console.log('Found user profile:', profile)
                  setUser({
                    fid: profile.fid || 0,
                    username: profile.username || profile.username || '',
                    displayName: profile.displayName || profile.display_name || profile.name || '',
                    pfp: profile.pfp || profile.pfp_url || profile.avatar_url || '',
                    followerCount: profile.followerCount || profile.followers_count || profile.followers || 0,
                    followingCount: profile.followingCount || profile.following_count || profile.following || 0
                  })
                  setError(null)
                  return
                } else {
                  console.log('No user profile found in response from', successfulEndpoint)
                  console.log('Available keys in response:', Object.keys(userData))
                  setError(`Felhasználói profil nem található a válaszban (${successfulEndpoint})`)
                }
              } else {
                console.log('All API endpoints failed')
                setError('Minden API endpoint sikertelen volt')
              }
            } else {
              console.log('No token received')
              setError('Nincs token elérhető')
            }
          } catch (authError) {
            console.log('QuickAuth error:', authError)
            setError(`QuickAuth hiba: ${authError}`)
          }
          
          // Fallback: show miniapp environment info
          console.log('Using fallback user data')
          setUser({
            fid: 0,
            username: 'miniapp_user',
            displayName: 'Miniapp User',
            pfp: 'https://picsum.photos/200',
            followerCount: 0,
            followingCount: 0
          })
          setError('Valódi adatok betöltése sikertelen, fallback adatok használata')
        } else {
          console.log('Not in miniapp environment')
          setUser(null)
          setError('Nem miniapp környezetben fut')
        }
      } catch (error) {
        console.error('Error loading miniapp user data:', error)
        setUser(null)
        setError(`Hiba: ${error}`)
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

  if (error) {
    return (
      <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4 border border-red-500/30 mb-6">
        <div className="text-center">
          <p className="text-red-300 text-sm mb-2">Hiba történt</p>
          <p className="text-gray-400 text-xs">{error}</p>
          {user && (
            <div className="mt-3 p-2 bg-gray-800/50 rounded-lg">
              <p className="text-green-400 text-xs">Fallback adatok használata</p>
            </div>
          )}
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