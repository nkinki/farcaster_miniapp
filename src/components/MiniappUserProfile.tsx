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
  rank24hChange?: number;
  rank72hChange?: number;
  rank7dChange?: number;
};

export const MiniappUserProfile: React.FC = () => {
  const [user, setUser] = useState<MiniappUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Find all miniapps for this user
  const [ownMiniapps, setOwnMiniapps] = useState<TopMiniapp[]>([])
  const [checkedMiniapps, setCheckedMiniapps] = useState(false)

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

          // Fetch all miniapps for this user
          let foundMiniapps: TopMiniapp[] = []
          if (u?.fid) {
            try {
              const res = await fetch('/top_miniapps.json')
              const topMiniapps: TopMiniapp[] = await res.json()
              foundMiniapps = topMiniapps.filter((item) => item.miniApp?.author?.fid === u.fid)
            } catch (e) {
              // ignore
            }
          }
          setOwnMiniapps(foundMiniapps)
          setCheckedMiniapps(true)

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

  // Only render on homepage (page.tsx)
  return (
    <div style={{ maxWidth: 400, margin: '24px auto', background: '#181818', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <img
          src={user.pfpUrl}
          alt={user.displayName}
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
          onError={e => {
            e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
          }}
        />
        <div style={{ fontWeight: 600, fontSize: 15 }}>{user.displayName || user.username}</div>
      </div>
      {checkedMiniapps && ownMiniapps.length === 0 && (
        <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', padding: 8 }}>
          No miniapp found for your account.
        </div>
      )}
      {ownMiniapps.length > 0 && ownMiniapps.map((mini, idx) => (
        <div key={mini.miniApp.name + idx} style={{ background: '#232323', borderRadius: 8, padding: '10px 14px', marginBottom: 8, color: '#fff', fontSize: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{mini.miniApp.name}</div>
          <div><b>Rank:</b> #{mini.rank}</div>
          {typeof mini.miniApp.userCount === 'number' && (
            <div><b>Users:</b> {mini.miniApp.userCount}</div>
          )}
          {typeof mini.rank24hChange === 'number' && (
            <div><b>24h:</b> {mini.rank24hChange > 0 ? '+' : ''}{mini.rank24hChange}</div>
          )}
          {typeof mini.rank72hChange === 'number' && (
            <div><b>72h:</b> {mini.rank72hChange > 0 ? '+' : ''}{mini.rank72hChange}</div>
          )}
          {typeof mini.rank7dChange === 'number' && (
            <div><b>7d:</b> {mini.rank7dChange > 0 ? '+' : ''}{mini.rank7dChange}</div>
          )}
        </div>
      ))}
    </div>
  )
} 