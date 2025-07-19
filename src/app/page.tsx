import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Farcaster Miniapp Demo',
  description: 'A simple Farcaster miniapp demonstration',
  openGraph: {
    title: 'Farcaster Miniapp Demo',
    description: 'Interactive Farcaster miniapp with buttons and actions',
    images: ['https://via.placeholder.com/1200x630/6366f1/ffffff?text=Farcaster+Miniapp'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Farcaster+Miniapp',
    'fc:frame:button:1': '🎲 Roll Dice',
    'fc:frame:button:2': '📊 View Stats',
    'fc:frame:button:3': '🎁 Claim Reward',
    'fc:frame:button:4': '🔄 Refresh',
    'fc:frame:post_url': `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame`,
  },
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🚀 Farcaster Miniapp
          </h1>
          <p className="text-gray-600">
            Interactive demo with Frame actions
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              🎲 Dice Roller
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Click the button to roll a dice and get a random number!
            </p>
            <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors">
              Roll Dice
            </button>
          </div>

          <div className="bg-gradient-to-r from-green-100 to-teal-100 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              📊 Statistics
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              View your activity and performance stats
            </p>
            <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
              View Stats
            </button>
          </div>

          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              🎁 Rewards
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Claim your daily rewards and tokens
            </p>
            <button className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors">
              Claim Reward
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            This is a demo Farcaster miniapp. Try sharing this URL in a Farcaster cast!
          </p>
        </div>
      </div>
    </div>
  )
}
