'use client'

import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk';

// Define types for miniapp data
interface Miniapp {
  rank: number
  name: string
  domain: string
  description: string
  author: {
    username: string
    displayName: string
    followerCount: number
  }
  category: string
  rank72hChange: number
  rank24hChange?: number
  rankWeeklyChange?: number
  rank30dChange?: number // <-- add this
  iconUrl: string
  homeUrl: string
  rankScore?: number; // Added for new list style
  points?: number; // Added for new list style
}

export default function Home() {
  const [miniapps, setMiniapps] = useState<Miniapp[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [filter, setFilter] = useState<'daily' | '72h' | 'weekly' | '30d'>('daily')

  useEffect(() => {
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('farcaster-favorites')
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }

    // Fetch miniapp data - use current domain (updated for Vercel deployment)
    const apiUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/miniapps?limit=246`
      : '/api/miniapps?limit=246'
    
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        console.log('API response:', data) // Debug log
        setMiniapps(data.miniapps || [])
        setLastUpdate(new Date().toLocaleTimeString('en-US'))
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        setLoading(false)
      })
  }, [])

  // Call sdk.actions.ready() when loading is finished
  useEffect(() => {
    if (!loading) {
      sdk.actions.ready();
    }
  }, [loading]);

  const toggleFavorite = (miniappId: string) => {
    const newFavorites = favorites.includes(miniappId)
      ? favorites.filter(id => id !== miniappId)
      : [...favorites, miniappId]
    
    setFavorites(newFavorites)
    localStorage.setItem('farcaster-favorites', JSON.stringify(newFavorites))
  }

  // Filter logic
  const filteredMiniapps = miniapps.filter(app => {
    if (filter === 'daily') return true;
    if (filter === '72h') return Math.abs(app.rank72hChange) > 0;
    if (filter === 'weekly') return Math.abs(app.rankWeeklyChange || 0) > 0;
    if (filter === '30d') return Math.abs(app.rank30dChange || 0) > 0;
    return true;
  });

  // Favorited apps first
  const sortedMiniapps = [
    ...filteredMiniapps.filter(app => favorites.includes(app.domain)),
    ...filteredMiniapps.filter(app => !favorites.includes(app.domain)),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex justify-center items-center mb-2">
            <span className="inline-block bg-black/40 border-2 border-cyan-300 rounded-lg shadow-[0_0_16px_2px_rgba(34,211,238,0.3)] px-4 py-2">
              <span className="text-2xl font-bold text-white uppercase tracking-[.35em]" style={{letterSpacing: '0.35em', fontWeight: 700, fontFamily: 'inherit'}}>A&nbsp;P&nbsp;P&nbsp;R&nbsp;A&nbsp;N&nbsp;K</span>
            </span>
          </div>
          <p className="text-purple-200 text-sm mb-1 font-medium">Farcaster miniapp toplist and statistics</p>
          <p className="text-purple-200 text-xs font-medium">{new Date().toLocaleDateString('en-US')} Updated: {lastUpdate}</p>
        </div>

        {/* Main Ranking List - Modern List Style */}
        <div className="bg-black/50 backdrop-blur-sm rounded-2xl shadow-2xl p-2 border border-purple-500/30">
          <div className="flex flex-col gap-2">
            {sortedMiniapps.map((app: Miniapp, idx: number) => {
              // Rank badge color
              let rankBg = 'bg-gray-700';
              let rankText = 'text-white';
              if (idx === 0) { rankBg = 'bg-gradient-to-br from-orange-400 to-yellow-300'; rankText = 'text-white'; }
              else if (idx === 1) { rankBg = 'bg-gradient-to-br from-gray-400 to-gray-200'; rankText = 'text-gray-900'; }
              else if (idx === 2) { rankBg = 'bg-gradient-to-br from-emerald-400 to-green-300'; rankText = 'text-white'; }
              // Highlight top 50
              const highlight = idx < 50 ? 'bg-[#23283a]/80' : 'bg-[#181c23]';
              return (
                <>
                  {idx === 50 && (
                    <div className="flex items-center my-2">
                      <div className="flex-1 h-px bg-cyan-400/60" />
                      <span className="mx-3 text-xs text-cyan-300 font-bold tracking-widest uppercase">Top 50 Reward Cutoff</span>
                      <div className="flex-1 h-px bg-cyan-400/60" />
                    </div>
                  )}
                  <div key={app.rank} className={`flex items-center justify-between rounded-xl px-3 py-2 ${highlight} border border-[#23283a] shadow-sm ${favorites.includes(app.domain) ? 'ring-2 ring-pink-400' : ''}`}> 
                    {/* Rank badge */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-base mr-2 ${rankBg} ${rankText}`}>{app.rank}</div>
                    {/* App logo */}
                    {app.iconUrl ? (
                      <img
                        src={app.iconUrl}
                        alt={app.name + ' logo'}
                        className="w-8 h-8 rounded-lg object-cover border border-purple-700/30 bg-white mr-2"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base bg-purple-700/60 text-white border border-purple-700/30 mr-2">
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* App info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{app.name}</div>
                      <div className="text-[10px] text-purple-300 truncate">@{app.author.username}</div>
                      <div className="text-[10px] text-cyan-300 flex items-center gap-1 mt-0.5">
                        <span className="text-xs">👥</span>
                        <span>{app.author.followerCount}</span>
                      </div>
                    </div>
                    {/* Favorite button - moved next to app info */}
                    <button
                      onClick={() => toggleFavorite(app.domain)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ml-2 ${favorites.includes(app.domain)
                        ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                        : 'bg-gray-800 text-gray-400 hover:bg-pink-900/50 hover:text-pink-400 border border-gray-700'}`}
                      title={favorites.includes(app.domain) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favorites.includes(app.domain) ? '❤️' : '🤍'}
                    </button>
                    {/* Rank changes mini-table - moved to far right */}
                    <div className="flex flex-col items-end ml-2 min-w-[60px] gap-0.5">
                      <div className="flex gap-1 items-center">
                        <span className={`font-semibold text-xs ${
                          (app.rank24hChange || 0) > 0 ? 'text-green-400' : (app.rank24hChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                        }`}>
                          {(app.rank24hChange || 0) > 0 ? '+' : ''}{app.rank24hChange || 0}
                        </span>
                        <span className="text-[10px] text-purple-400">24h</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className={`font-semibold text-xs ${
                          app.rank72hChange > 0 ? 'text-green-400' : app.rank72hChange < 0 ? 'text-red-400' : 'text-purple-300'
                        }`}>
                          {app.rank72hChange > 0 ? '+' : ''}{app.rank72hChange}
                        </span>
                        <span className="text-[10px] text-purple-400">72h</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className={`font-semibold text-xs ${
                          (app.rankWeeklyChange || 0) > 0 ? 'text-green-400' : (app.rankWeeklyChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                        }`}>
                          {(app.rankWeeklyChange || 0) > 0 ? '+' : ''}{app.rankWeeklyChange || 0}
                        </span>
                        <span className="text-[10px] text-purple-400">7d</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className={`font-semibold text-xs ${
                          (app.rank30dChange || 0) > 0 ? 'text-green-400' : (app.rank30dChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                        }`}>
                          {(app.rank30dChange || 0) > 0 ? '+' : ''}{app.rank30dChange || 0}
                        </span>
                        <span className="text-[10px] text-cyan-300">30d</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })}
          </div>
        </div>
      </div>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-black/80 border-t border-purple-700/40 z-50 flex justify-center gap-4 py-3 backdrop-blur-md" style={{position: 'sticky', bottom: 0}}>
        <button
          className={`px-6 py-2 rounded-md font-bold text-base transition-all duration-200 ${filter === 'daily' ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-900 text-purple-300 hover:bg-purple-800'}`}
          onClick={() => setFilter('daily')}
        >
          Daily
        </button>
        <button
          className={`px-6 py-2 rounded-md font-bold text-base transition-all duration-200 ${filter === '72h' ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-900 text-purple-300 hover:bg-purple-800'}`}
          onClick={() => setFilter('72h')}
        >
          72h
        </button>
        <button
          className={`px-6 py-2 rounded-md font-bold text-base transition-all duration-200 ${filter === 'weekly' ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-900 text-purple-300 hover:bg-purple-800'}`}
          onClick={() => setFilter('weekly')}
        >
          Weekly
        </button>
        <button
          className={`px-6 py-2 rounded-md font-bold text-base transition-all duration-200 ${filter === '30d' ? 'bg-cyan-500 text-white shadow-lg' : 'bg-purple-900 text-cyan-300 hover:bg-cyan-800'}`}
          onClick={() => setFilter('30d')}
        >
          30d
        </button>
      </div>
    </div>
  )
}
