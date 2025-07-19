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
        setLastUpdate(new Date().toLocaleTimeString('hu-HU'))
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
            🏆 Miniapps Rangsor
          </h1>
          <p className="text-purple-200 text-lg mb-2">
            Farcaster miniapp toplista és statisztikák
          </p>
          <p className="text-purple-200 text-sm">
            {new Date().toLocaleDateString('hu-HU')} Frissítve: {lastUpdate}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-blue-600">{miniapps.length}</div>
            <div className="text-gray-600">Összes Miniapp</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-blue-600">+{favorites.length}</div>
            <div className="text-gray-600">Favoritok</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-lg">
            <div className="text-3xl font-bold text-blue-600">
              {miniapps.length > 0 ? miniapps[0].name : '-'}
            </div>
            <div className="text-gray-600">#1 Miniapp</div>
          </div>
        </div>

        {/* Main Ranking List */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Mai Top {miniapps.length}</h2>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">
                Lista
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {miniapps.map((app: Miniapp) => (
              <div key={app.rank} className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200 hover:shadow-md transition-shadow">
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
                    <h3 className="font-semibold text-gray-800 text-lg">{app.name}</h3>
                    <p className="text-sm text-gray-600">{app.domain}</p>
                    <p className="text-xs text-gray-500">@{app.author.username}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Rank change */}
                  <div className="text-right">
                    <span className={`text-lg font-semibold ${
                      app.rank72hChange > 0 ? 'text-green-600' : 
                      app.rank72hChange < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {app.rank72hChange > 0 ? '+' : ''}{app.rank72hChange}
                    </span>
                    <div className="text-sm text-gray-500">
                      {app.author.followerCount.toLocaleString()} követő
                    </div>
                  </div>
                  
                  {/* Favorite button */}
                  <button
                    onClick={() => toggleFavorite(app.rank.toString())}
                    className={`text-2xl transition-colors ${
                      favorites.includes(app.rank.toString()) 
                        ? 'text-red-500 hover:text-red-600' 
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    {favorites.includes(app.rank.toString()) ? '❤️' : '🤍'}
                  </button>
                  
                  {/* Action buttons */}
                  <div className="flex space-x-2">
                    {app.homeUrl && (
                      <a 
                        href={app.homeUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Megnyitás
                      </a>
                    )}
                    <button className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm">
                      Megosztás
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center text-purple-200">
          <p className="text-sm">
            Favoritok: {favorites.length} | Összesen: {miniapps.length} miniapp
          </p>
        </div>
      </div>
    </div>
  )
}
