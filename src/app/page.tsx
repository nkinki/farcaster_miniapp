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
  iconUrl: string
  homeUrl: string
}

export default function Home() {
  const [miniapps, setMiniapps] = useState<Miniapp[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [filter, setFilter] = useState<'daily' | '72h' | 'weekly'>('daily')

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
            <span className="text-2xl font-bold text-white uppercase tracking-[.35em]" style={{letterSpacing: '0.35em', fontWeight: 700, fontFamily: 'inherit', paddingLeft: '0.175em', paddingRight: '0.175em'}}>A&nbsp;P&nbsp;P&nbsp;R&nbsp;A&nbsp;N&nbsp;K</span>
          </div>
          <p className="text-purple-200 text-sm mb-1 font-medium">Farcaster miniapp toplist and statistics</p>
          <p className="text-purple-200 text-xs font-medium">{new Date().toLocaleDateString('en-US')} Updated: {lastUpdate}</p>
        </div>

        {/* Main Ranking List - Compact Grid */}
        <div className="bg-black/50 backdrop-blur-sm rounded-2xl shadow-2xl p-4 border border-purple-500/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              {filter === 'daily' && "Today's Top"}
              {filter === '72h' && "Top Movers (72h)"}
              {filter === 'weekly' && "Top Movers (7d)"}
              {' '}{sortedMiniapps.length}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {sortedMiniapps.map((app: Miniapp) => (
              <div key={app.rank} className={`flex flex-col justify-between bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-2 border border-purple-500/30 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300 ${favorites.includes(app.domain) ? 'ring-2 ring-pink-400' : ''}`}>
                <div className="flex items-center space-x-1 mb-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-full flex items-center justify-center font-bold text-xs border border-purple-400/30">
                    #{app.rank}
                  </div>
                  {app.iconUrl ? (
                    <img
                      src={app.iconUrl}
                      alt={app.name + ' logo'}
                      className="w-6 h-6 rounded-md object-cover border border-purple-700/30 bg-white"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs bg-purple-700/60 text-white border border-purple-700/30">
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-purple-200 text-xs truncate">{app.name}</h3>
                    <p className="text-[10px] text-purple-300 font-medium truncate">{app.domain}</p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(app.domain)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-1 ${favorites.includes(app.domain)
                      ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                      : 'bg-gray-800 text-gray-400 hover:bg-pink-900/50 hover:text-pink-400 border border-gray-700'}`}
                    title={favorites.includes(app.domain) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favorites.includes(app.domain) ? '❤️' : '🤍'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 text-[10px] text-purple-400">
                  <span className={`font-semibold ${
                    (app.rank24hChange || 0) > 0 ? 'text-green-400' : (app.rank24hChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                  }`}>
                    {(app.rank24hChange || 0) > 0 ? '+' : ''}{app.rank24hChange || 0} 24h
                  </span>
                  <span className={`font-semibold ${
                    app.rank72hChange > 0 ? 'text-green-400' : app.rank72hChange < 0 ? 'text-red-400' : 'text-purple-300'
                  }`}>
                    {app.rank72hChange > 0 ? '+' : ''}{app.rank72hChange} 72h
                  </span>
                  <span className={`font-semibold ${
                    (app.rankWeeklyChange || 0) > 0 ? 'text-green-400' : (app.rankWeeklyChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                  }`}>
                    {(app.rankWeeklyChange || 0) > 0 ? '+' : ''}{app.rankWeeklyChange || 0} 7d
                  </span>
                  <span className="text-[10px] text-purple-400 font-medium">
                    {app.author.followerCount.toLocaleString()} followers
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-black/80 border-t border-purple-700/40 z-50 flex justify-center gap-4 py-3 backdrop-blur-md">
        <button
          className={`px-6 py-2 rounded-full font-bold text-base transition-all duration-200 ${filter === 'daily' ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-900 text-purple-300 hover:bg-purple-800'}`}
          onClick={() => setFilter('daily')}
        >
          Daily
        </button>
        <button
          className={`px-6 py-2 rounded-full font-bold text-base transition-all duration-200 ${filter === '72h' ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-900 text-purple-300 hover:bg-purple-800'}`}
          onClick={() => setFilter('72h')}
        >
          72h
        </button>
        <button
          className={`px-6 py-2 rounded-full font-bold text-base transition-all duration-200 ${filter === 'weekly' ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-900 text-purple-300 hover:bg-purple-800'}`}
          onClick={() => setFilter('weekly')}
        >
          Weekly
        </button>
      </div>
    </div>
  )
}
