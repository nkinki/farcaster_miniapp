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
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            🏆 Miniapps Rankings
          </h1>
          <p className="text-purple-100 text-lg mb-2 font-medium">
            Farcaster miniapp toplist and statistics
          </p>
          <p className="text-purple-100 text-sm font-medium">
            {new Date().toLocaleDateString('en-US')} Updated: {lastUpdate}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 text-center shadow-lg border border-gray-200">
            <div className="text-2xl font-bold text-blue-700">{miniapps.length}</div>
            <div className="text-gray-700 text-sm font-medium">Total</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-lg border border-gray-200">
            <div className="text-2xl font-bold text-purple-700">+{favorites.length}</div>
            <div className="text-gray-700 text-sm font-medium">Favorites</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-700">
              {miniapps.filter(app => (app.rank24hChange || 0) > 0).length}
            </div>
            <div className="text-gray-700 text-sm font-medium">Rising (24h)</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-700">
              {miniapps.filter(app => app.rank72hChange > 0).length}
            </div>
            <div className="text-gray-700 text-sm font-medium">Rising (72h)</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-lg border border-gray-200">
            <div className="text-2xl font-bold text-green-700">
              {miniapps.filter(app => (app.rankWeeklyChange || 0) > 0).length}
            </div>
            <div className="text-gray-700 text-sm font-medium">Rising (7d)</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-lg border border-gray-200">
            <div className="text-2xl font-bold text-red-700">
              {miniapps.filter(app => app.rank72hChange < 0).length}
            </div>
            <div className="text-gray-700 text-sm font-medium">Falling (72h)</div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 24h Top Risers */}
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-3">📈 Top Risers (24h)</h3>
              <div className="space-y-2">
                {miniapps
                  .filter(app => (app.rank24hChange || 0) > 0)
                  .sort((a, b) => (b.rank24hChange || 0) - (a.rank24hChange || 0))
                  .slice(0, 5)
                  .map((app, index) => (
                    <div key={app.rank} className="flex justify-between items-center p-2 bg-green-100 rounded border border-green-200">
                      <span className="text-sm font-medium text-gray-800 truncate">{app.name}</span>
                      <span className="text-sm text-green-700 font-bold">+{app.rank24hChange || 0}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 72h Top Risers */}
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-3">📈 Top Risers (72h)</h3>
              <div className="space-y-2">
                {miniapps
                  .filter(app => app.rank72hChange > 0)
                  .sort((a, b) => b.rank72hChange - a.rank72hChange)
                  .slice(0, 5)
                  .map((app, index) => (
                    <div key={app.rank} className="flex justify-between items-center p-2 bg-green-100 rounded border border-green-200">
                      <span className="text-sm font-medium text-gray-800 truncate">{app.name}</span>
                      <span className="text-sm text-green-700 font-bold">+{app.rank72hChange}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Weekly Top Risers */}
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-3">📈 Top Risers (7d)</h3>
              <div className="space-y-2">
                {miniapps
                  .filter(app => (app.rankWeeklyChange || 0) > 0)
                  .sort((a, b) => (b.rankWeeklyChange || 0) - (a.rankWeeklyChange || 0))
                  .slice(0, 5)
                  .map((app, index) => (
                    <div key={app.rank} className="flex justify-between items-center p-2 bg-green-100 rounded border border-green-200">
                      <span className="text-sm font-medium text-gray-800 truncate">{app.name}</span>
                      <span className="text-sm text-green-700 font-bold">+{app.rankWeeklyChange || 0}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold text-purple-700 mb-3">🏷️ Categories</h3>
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
                    <div key={category} className="flex justify-between items-center p-2 bg-purple-100 rounded border border-purple-200">
                      <span className="text-sm font-medium text-gray-800 capitalize truncate">{category}</span>
                      <span className="text-sm text-purple-700 font-bold">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Ranking List */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Today's Top {miniapps.length}</h2>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium">
                List
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {miniapps.map((app: Miniapp) => (
              <div key={app.rank} className="flex items-center justify-between bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 border border-purple-300 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  {/* Rank */}
                  <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    #{app.rank}
                  </div>
                  
                  {/* Icon placeholder */}
                  <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center text-2xl">
                    😊
                  </div>
                  
                  {/* App info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{app.name}</h3>
                    <p className="text-sm text-gray-700 font-medium">{app.domain}</p>
                    <p className="text-xs text-gray-600 font-medium">@{app.author.username}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Rank changes */}
                  <div className="text-right space-y-1">
                    <div className="flex space-x-2 text-xs">
                      <span className={`font-semibold ${
                        (app.rank24hChange || 0) > 0 ? 'text-green-700' : 
                        (app.rank24hChange || 0) < 0 ? 'text-red-700' : 'text-gray-700'
                      }`}>
                        {(app.rank24hChange || 0) > 0 ? '+' : ''}{app.rank24hChange || 0}
                      </span>
                      <span className="text-gray-600 font-medium">24h</span>
                    </div>
                    <div className="flex space-x-2 text-xs">
                      <span className={`font-semibold ${
                        app.rank72hChange > 0 ? 'text-green-700' : 
                        app.rank72hChange < 0 ? 'text-red-700' : 'text-gray-700'
                      }`}>
                        {app.rank72hChange > 0 ? '+' : ''}{app.rank72hChange}
                      </span>
                      <span className="text-gray-600 font-medium">72h</span>
                    </div>
                    <div className="flex space-x-2 text-xs">
                      <span className={`font-semibold ${
                        (app.rankWeeklyChange || 0) > 0 ? 'text-green-700' : 
                        (app.rankWeeklyChange || 0) < 0 ? 'text-red-700' : 'text-gray-700'
                      }`}>
                        {(app.rankWeeklyChange || 0) > 0 ? '+' : ''}{app.rankWeeklyChange || 0}
                      </span>
                      <span className="text-gray-600 font-medium">7d</span>
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      {app.author.followerCount.toLocaleString()} followers
                    </div>
                  </div>

                  {/* Favorite button */}
                  <button
                    onClick={() => toggleFavorite(app.domain)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      favorites.includes(app.domain)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-red-100'
                    }`}
                  >
                    ❤️
                  </button>

                  {/* Visit button */}
                  <a
                    href={app.homeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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
