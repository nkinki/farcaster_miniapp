import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Farcaster Daily Miniapp Tracker',
  description: 'Track daily Farcaster miniapp rankings and statistics',
  openGraph: {
    title: 'Farcaster Daily Miniapp Tracker',
    description: 'Daily rankings and statistics for Farcaster miniapps',
    images: ['https://via.placeholder.com/1200x630/6366f1/ffffff?text=Daily+Miniapp+Tracker'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Daily+Miniapp+Tracker',
    'fc:frame:button:1': '📊 Top 10 Miniapps',
    'fc:frame:button:2': '📈 Daily Stats',
    'fc:frame:button:3': '🏆 Rankings',
    'fc:frame:button:4': '🔄 Refresh',
    'fc:frame:post_url': `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame`,
  },
}

async function getMiniappData() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/miniapps?limit=10`, {
      cache: 'no-store'
    })
    if (!response.ok) throw new Error('Failed to fetch data')
    return await response.json()
  } catch (error) {
    console.error('Error fetching miniapp data:', error)
    return {
      miniapps: [],
      stats: {
        totalMiniapps: 0,
        newToday: 0,
        activeUsers: '0K',
        avgRating: '0.0⭐',
        topCategories: []
      }
    }
  }
}

export default async function Home() {
  const { miniapps, stats } = await getMiniappData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🚀 Farcaster Daily Miniapp Tracker
          </h1>
          <p className="text-gray-600 text-lg">
            Track daily rankings and statistics for Farcaster miniapps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Miniapps Section */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              📊 Top 10 Miniapps
            </h2>
            <div className="space-y-3">
              {miniapps.slice(0, 5).map((app: any) => (
                <div key={app.rank} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-purple-600">#{app.rank}</span>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">{app.name}</span>
                      <span className="text-xs text-gray-500">@{app.author.username}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${
                      app.rank72hChange > 0 ? 'text-green-600' : 
                      app.rank72hChange < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {app.rank72hChange > 0 ? '+' : ''}{app.rank72hChange}
                    </span>
                    <div className="text-xs text-gray-500">{app.author.followerCount.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors">
              View All Rankings
            </button>
          </div>

          {/* Daily Statistics */}
          <div className="bg-gradient-to-r from-green-100 to-teal-100 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
              📈 Daily Statistics
            </h2>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Miniapps</span>
                  <span className="text-2xl font-bold text-green-600">{stats.totalMiniapps.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">New Today</span>
                  <span className="text-2xl font-bold text-blue-600">+{stats.newToday}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Users</span>
                  <span className="text-2xl font-bold text-purple-600">{stats.activeUsers}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg. Rating</span>
                  <span className="text-2xl font-bold text-yellow-600">{stats.avgRating}</span>
                </div>
              </div>
            </div>
            <button className="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
              Detailed Analytics
            </button>
          </div>
        </div>

        {/* Categories Section */}
        <div className="mt-8 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            🏆 Top Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.topCategories.map((category: any, index: number) => {
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500']
              return (
                <div key={category.name} className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className={`w-12 h-12 ${colors[index]} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                    <span className="text-white font-bold">{category.count}</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 capitalize">{category.name}</h3>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Data updates daily. Share this URL in a Farcaster cast to see the Frame in action!
          </p>
        </div>
      </div>
    </div>
  )
}
