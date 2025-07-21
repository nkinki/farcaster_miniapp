'use client'

import React, { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

interface MiniappUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  followerCount: number
  followingCount: number
}

type TopMiniapp = {
  rank: number;
  miniApp: {
    name: string;
    author: {
      fid: number;
      displayName?: string;
      username?: string;
      // add more fields if needed
    };
    userCount?: number;
    // add more fields if needed
  };
};

export const MiniappUserProfile: React.FC = () => {
  const [user, setUser] = useState<MiniappUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [ownMiniapp, setOwnMiniapp] = useState<TopMiniapp | null>(null)

  useEffect(() => {
    const getUserData = async () => {
      setIsLoading(true)
      try {
        const isInMiniapp = await sdk.isInMiniApp()
        if (isInMiniapp) {
          const context = await sdk.context
          const u = context.user
          let followerCount = 0
          let followingCount = 0

          // Fetch top_miniapps.json from public folder
          let foundMiniapp: TopMiniapp | null = null
          if (u?.fid) {
            try {
              const res = await fetch('/top_miniapps.json')
              const topMiniapps: TopMiniapp[] = await res.json()
              foundMiniapp = topMiniapps.find((item) => item.miniApp?.author?.fid === u.fid) || null
            } catch (e) {
              // ignore
            }
          }
          setOwnMiniapp(foundMiniapp)

          // Try to get QuickAuth token and fetch follower/following counts
          try {
            const token = await sdk.quickAuth.getToken()
            if (token && u?.fid) {
              const response = await sdk.quickAuth.fetch(
                `https://api.farcaster.xyz/v2/user-by-fid?fid=${u.fid}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              )
              if (response.ok) {
                const data = await response.json()
                const profile = data.result?.user
                followerCount = typeof profile?.followerCount === 'number' ? profile.followerCount : 0
                followingCount = typeof profile?.followingCount === 'number' ? profile.followingCount : 0
              }
            }
          } catch (e) {
            // fallback: counts remain 0
          }

          setUser({
            fid: u.fid,
            username: u.username || '',
            displayName: u.displayName || '',
            pfpUrl: u.pfpUrl || '',
            followerCount,
            followingCount
          })
        }
      } finally {
        setIsLoading(false)
      }
    }
    getUserData()
  }, [])

  if (isLoading) {
    return <div>Loading profile...</div>
  }

  if (!user) {
    return <div>No user data available.</div>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: '#181818', borderRadius: 8, padding: 16, color: '#fff', fontSize: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.10)', marginBottom: 16 }}>
      {/* Left: user logo and name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src={user.pfpUrl}
          alt={user.displayName}
          style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
          onError={e => {
            e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
          }}
        />
        <div style={{ fontWeight: 600, fontSize: 18 }}>{user.displayName || user.username}</div>
      </div>
      {/* Right: miniapp stats if present */}
      {ownMiniapp && (
        <div style={{ marginLeft: 'auto', background: '#232323', borderRadius: 8, padding: '12px 20px', color: '#fff', fontSize: 15, boxShadow: '0 1px 4px rgba(0,0,0,0.10)', minWidth: 180 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Your Miniapp</div>
          <div><b>Name:</b> {ownMiniapp.miniApp.name}</div>
          <div><b>Rank:</b> #{ownMiniapp.rank}</div>
          {typeof ownMiniapp.miniApp.userCount === 'number' && (
            <div><b>Users:</b> {ownMiniapp.miniApp.userCount}</div>
          )}
        </div>
      )}
    </div>
  )
} 