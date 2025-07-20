'use client'

import { useState, useEffect } from 'react'

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

  const toggleFavorite = (miniappId: string) => {
    const newFavorites = favorites.includes(miniappId)
      ? favorites.filter(id => id !== miniappId)
      : [...favorites, miniappId]
    
    setFavorites(newFavorites)
    localStorage.setItem('farcaster-favorites', JSON.stringify(newFavorites))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-purple-400 mb-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
            🏆 Miniapps Rankings
          </h1>
          <p className="text-purple-300 text-lg mb-2 font-medium">
            Farcaster miniapp toplist and statistics
          </p>
          <p className="text-purple-200 text-sm font-medium">
            {new Date().toLocaleDateString('en-US')} Updated: {lastUpdate}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-center shadow-lg border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
            <div className="text-2xl font-bold text-purple-400">{miniapps.length}</div>
            <div className="text-purple-300 text-sm font-medium">Total</div>
          </div>
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-center shadow-lg border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
            <div className="text-2xl font-bold text-pink-400">+{favorites.length}</div>
            <div className="text-purple-300 text-sm font-medium">Favorites</div>
          </div>
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-center shadow-lg border border-green-500/30 hover:border-green-400/50 transition-all duration-300">
            <div className="text-2xl font-bold text-green-400">
              {miniapps.filter(app => (app.rank24hChange || 0) > 0).length}
            </div>
            <div className="text-green-300 text-sm font-medium">Rising (24h)</div>
          </div>
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-center shadow-lg border border-green-500/30 hover:border-green-400/50 transition-all duration-300">
            <div className="text-2xl font-bold text-green-400">
              {miniapps.filter(app => app.rank72hChange > 0).length}
            </div>
            <div className="text-green-300 text-sm font-medium">Rising (72h)</div>
          </div>
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-center shadow-lg border border-green-500/30 hover:border-green-400/50 transition-all duration-300">
            <div className="text-2xl font-bold text-green-400">
              {miniapps.filter(app => (app.rankWeeklyChange || 0) > 0).length}
            </div>
            <div className="text-green-300 text-sm font-medium">Rising (7d)</div>
          </div>
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-center shadow-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-300">
            <div className="text-2xl font-bold text-red-400">
              {miniapps.filter(app => app.rank72hChange < 0).length}
            </div>
            <div className="text-red-300 text-sm font-medium">Falling (72h)</div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="bg-black/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6 border border-purple-500/30">
          <h2 className="text-2xl font-bold text-purple-400 mb-4 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">📊 Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 24h Top Risers */}
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3">📈 Top Risers (24h)</h3>
              <div className="space-y-2">
                {miniapps
                  .filter(app => (app.rank24hChange || 0) > 0)
                  .sort((a, b) => (b.rank24hChange || 0) - (a.rank24hChange || 0))
                  .slice(0, 5)
                  .map((app) => (
                    <div key={app.rank} className="flex justify-between items-center p-2 bg-green-900/30 rounded border border-green-500/30 hover:border-green-400/50 transition-all duration-300">
                      <span className="text-sm font-medium text-green-200 truncate">{app.name}</span>
                      <span className="text-sm text-green-400 font-bold">+{app.rank24hChange || 0}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 72h Top Risers */}
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3">📈 Top Risers (72h)</h3>
              <div className="space-y-2">
                {miniapps
                  .filter(app => app.rank72hChange > 0)
                  .sort((a, b) => b.rank72hChange - a.rank72hChange)
                  .slice(0, 5)
                  .map((app) => (
                    <div key={app.rank} className="flex justify-between items-center p-2 bg-green-900/30 rounded border border-green-500/30 hover:border-green-400/50 transition-all duration-300">
                      <span className="text-sm font-medium text-green-200 truncate">{app.name}</span>
                      <span className="text-sm text-green-400 font-bold">+{app.rank72hChange}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Weekly Top Risers */}
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3">📈 Top Risers (7d)</h3>
              <div className="space-y-2">
                {miniapps
                  .filter(app => (app.rankWeeklyChange || 0) > 0)
                  .sort((a, b) => (b.rankWeeklyChange || 0) - (a.rankWeeklyChange || 0))
                  .slice(0, 5)
                  .map((app) => (
                    <div key={app.rank} className="flex justify-between items-center p-2 bg-green-900/30 rounded border border-green-500/30 hover:border-green-400/50 transition-all duration-300">
                      <span className="text-sm font-medium text-green-200 truncate">{app.name}</span>
                      <span className="text-sm text-green-400 font-bold">+{app.rankWeeklyChange || 0}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-3">🏷️ Categories</h3>
              <div className="space-y-2">
                {Object.entries(
                  miniapps.reduce((acc, app) => {
                    acc[app.category] = (acc[app.category] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                )
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center p-2 bg-purple-900/30 rounded border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
                      <span className="text-sm font-medium text-purple-200 capitalize truncate">{category}</span>
                      <span className="text-sm text-purple-400 font-bold">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Ranking List */}
        <div className="bg-black/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-purple-500/30">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">Today&apos;s Top {miniapps.length}</h2>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500 transition-colors border border-purple-400/30">
                List
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {miniapps.map((app: Miniapp) => (
              <div key={app.rank} className="flex items-center justify-between bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-4 border border-purple-500/30 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-300">
                <div className="flex items-center space-x-4">
                  {/* Rank */}
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-full flex items-center justify-center font-bold text-lg border border-purple-400/30">
                    #{app.rank}
                  </div>
                  
                  {/* Icon placeholder */}
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-2xl border border-yellow-400/30">
                    😊
                  </div>
                  
                  {/* App info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-200 text-lg">{app.name}</h3>
                    <p className="text-sm text-purple-300 font-medium">{app.domain}</p>
                    <p className="text-xs text-purple-400 font-medium">@{app.author.username}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Rank changes */}
                  <div className="text-right space-y-1">
                    <div className="flex space-x-2 text-xs">
                      <span className={`font-semibold ${
                        (app.rank24hChange || 0) > 0 ? 'text-green-400' : 
                        (app.rank24hChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                      }`}>
                        {(app.rank24hChange || 0) > 0 ? '+' : ''}{app.rank24hChange || 0}
                      </span>
                      <span className="text-purple-400 font-medium">24h</span>
                    </div>
                    <div className="flex space-x-2 text-xs">
                      <span className={`font-semibold ${
                        app.rank72hChange > 0 ? 'text-green-400' : 
                        app.rank72hChange < 0 ? 'text-red-400' : 'text-purple-300'
                      }`}>
                        {app.rank72hChange > 0 ? '+' : ''}{app.rank72hChange}
                      </span>
                      <span className="text-purple-400 font-medium">72h</span>
                    </div>
                    <div className="flex space-x-2 text-xs">
                      <span className={`font-semibold ${
                        (app.rankWeeklyChange || 0) > 0 ? 'text-green-400' : 
                        (app.rankWeeklyChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                      }`}>
                        {(app.rankWeeklyChange || 0) > 0 ? '+' : ''}{app.rankWeeklyChange || 0}
                      </span>
                      <span className="text-purple-400 font-medium">7d</span>
                    </div>
                    <div className="text-xs text-purple-400 font-medium">
                      {app.author.followerCount.toLocaleString()} followers
                    </div>
                  </div>

                  {/* Favorite button */}
                  <button
                    onClick={() => toggleFavorite(app.domain)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      favorites.includes(app.domain)
                        ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                        : 'bg-gray-800 text-gray-400 hover:bg-pink-900/50 hover:text-pink-400 border border-gray-700'
                    }`}
                  >
                    ❤️
                  </button>

                  {/* Visit button */}
                  <a
                    href={app.homeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-500 hover:to-purple-500 transition-all duration-300 border border-blue-400/30 hover:border-blue-300/50"
                  >
                    Visit
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
