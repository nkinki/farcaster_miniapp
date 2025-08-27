"use client"

import { useState } from 'react'
import PvPArenaNew from '@/components/pvp/PvPArenaNew'

export default function TestPvPPage() {
  const [playerFid, setPlayerFid] = useState(12345)
  const [playerName, setPlayerName] = useState('TestPlayer')
  const [playerAvatar, setPlayerAvatar] = useState('https://via.placeholder.com/40')

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Test Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">PvP Arena Test Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Player FID
              </label>
              <input
                type="number"
                value={playerFid}
                onChange={(e) => setPlayerFid(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-400"
                placeholder="Enter FID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Player Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-400"
                placeholder="Enter player name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Avatar URL
              </label>
              <input
                type="text"
                value={playerAvatar}
                onChange={(e) => setPlayerAvatar(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-400"
                placeholder="Enter avatar URL"
              />
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-600/20 rounded border border-blue-600/30">
            <p className="text-sm text-blue-300">
              <strong>Test Instructions:</strong>
            </p>
            <ul className="text-sm text-blue-200 mt-2 space-y-1">
              <li>• Change the player details above to test different scenarios</li>
              <li>• Open multiple browser tabs to simulate different players</li>
              <li>• Test the heartbeat system by waiting 30+ seconds</li>
              <li>• Use the admin panel at <code className="bg-blue-800 px-1 rounded">/admin/pvp-connections</code></li>
            </ul>
          </div>
        </div>

        {/* PvP Arena Component */}
        <PvPArenaNew
          playerFid={playerFid}
          playerName={playerName}
          playerAvatar={playerAvatar}
        />
      </div>
    </div>
  )
}
