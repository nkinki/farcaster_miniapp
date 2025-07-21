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
    <div style={{ maxWidth: 320, margin: '18px auto', background: 'transparent', borderRadius: 8, padding: 0 }}>
      {checkedMiniapps && ownMiniapps.length === 0 && (
        <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', padding: 10, background: '#181818', borderRadius: 8, fontSize: 13 }}>
          Welcome! Check back later for updates on your miniapp stats.
        </div>
      )}
      {ownMiniapps.length > 0 && ownMiniapps.map((mini, idx) => {
        const stat24 = typeof mini.rank24hChange === 'number' ? mini.rank24hChange : 0;
        const stat72 = typeof mini.rank72hChange === 'number' ? mini.rank72hChange : 0;
        const stat7d = typeof mini.rank7dChange === 'number' ? mini.rank7dChange : 0;
        return (
          <div key={mini.miniApp.name + idx} style={{
            background: '#232323',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 8,
            color: '#fff',
            fontSize: 13,
            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
            border: '2px solid #2fff8c',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{mini.miniApp.name}</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginRight: 8 }}>#{mini.rank}</div>
            <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: stat24 > 0 ? '#2fff8c' : stat24 < 0 ? '#ff4d4f' : '#b983ff', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>
                {stat24 > 0 ? '+' : ''}{stat24} <span style={{ color: '#b983ff', fontWeight: 400, fontSize: 12 }}>24h</span>
              </span>
              <span style={{ color: stat72 > 0 ? '#2fff8c' : stat72 < 0 ? '#ff4d4f' : '#b983ff', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>
                {stat72 > 0 ? '+' : ''}{stat72} <span style={{ color: '#b983ff', fontWeight: 400, fontSize: 12 }}>72h</span>
              </span>
              <span style={{ color: stat7d > 0 ? '#2fff8c' : stat7d < 0 ? '#ff4d4f' : '#b983ff', fontWeight: 700, minWidth: 24, textAlign: 'right' }}>
                {stat7d > 0 ? '+' : ''}{stat7d} <span style={{ color: '#b983ff', fontWeight: 400, fontSize: 12 }}>7d</span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
} 