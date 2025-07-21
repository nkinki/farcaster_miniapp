'use client'

import React, { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import topMiniapps from '../top_miniapps.json'

interface MiniappUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  followerCount: number
  followingCount: number
}

export const MiniappUserProfile: React.FC = () => {
  const [user, setUser] = useState<MiniappUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [ownMiniapp, setOwnMiniapp] = useState<any | null>(null)

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

          // Dynamically import top_miniapps.json
          let foundMiniapp = null
          if (u?.fid) {
            try {
              const topMiniapps = (await import('../top_miniapps.json')).default as any[]
              foundMiniapp = topMiniapps.find((item) => item.miniApp?.author?.fid === u.fid)
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
    <>
      <div className="profile-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8 }}>
        <img
          src={user.pfpUrl}
          alt={user.displayName}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
          onError={e => {
            e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontWeight: 600 }}>{user.displayName || user.username}</div>
          <div style={{ color: '#888', fontSize: 13 }}>@{user.username}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginLeft: 16, fontSize: 15 }}>
          <span>👥 <b>{user.followerCount}</b> Followers</span>
          <span>👤 <b>{user.followingCount}</b> Following</span>
          <span>🏆 <b>#{user.fid}</b> FID</span>
        </div>
      </div>
      {ownMiniapp && (
        <div style={{ marginTop: 8, background: '#181818', borderRadius: 8, padding: 12, color: '#fff', fontSize: 15, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Your Miniapp</div>
          <div><b>Name:</b> {ownMiniapp.miniApp.name}</div>
          <div><b>Rank:</b> #{ownMiniapp.rank}</div>
          {typeof ownMiniapp.miniApp.userCount === 'number' && (
            <div><b>Users:</b> {ownMiniapp.miniApp.userCount}</div>
          )}
          {/* Add more stats if available */}
        </div>
      )}
    </>
  )
} 