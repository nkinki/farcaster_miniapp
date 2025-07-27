'use client'

import { useState, useEffect } from "react"

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
        // ...fetch user and miniapps...
      } finally {
        setIsLoading(false)
        setCheckedMiniapps(true)
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
        const stat24 = mini.rank24hChange ?? 0
        const stat72 = mini.rank72hChange ?? 0
        const stat7d = mini.rank7dChange ?? 0
        return (
          <div key={idx} style={{ background: '#181818', borderRadius: 8, marginBottom: 12, padding: '12px 16px', boxShadow: '0 2px 8px #0002' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 4 }}>
              {mini.miniApp.name}
            </div>
            <div style={{ fontSize: 13, color: '#b983ff', marginBottom: 8 }}>
              by {mini.miniApp.author.displayName || mini.miniApp.author.username || mini.miniApp.author.fid}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 16, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: stat24 > 0 ? '#2fff8c' : stat24 < 0 ? '#ff4d4f' : '#b983ff', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                  <span>{stat24 > 0 ? '+' : ''}{stat24}</span>
                  <span style={{ color: '#b983ff', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>24h</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: stat72 > 0 ? '#2fff8c' : stat72 < 0 ? '#ff4d4f' : '#b983ff', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                  <span>{stat72 > 0 ? '+' : ''}{stat72}</span>
                  <span style={{ color: '#b983ff', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>72h</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: stat7d > 0 ? '#2fff8c' : stat7d < 0 ? '#ff4d4f' : '#b983ff', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                  <span>{stat7d > 0 ? '+' : ''}{stat7d}</span>
                  <span style={{ color: '#b983ff', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>7d</span>
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>