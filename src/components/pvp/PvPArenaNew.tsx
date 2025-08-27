"use client"

import { useState, useEffect, useCallback } from 'react'
import { FiUsers, FiZap, FiClock, FiWifi, FiWifiOff } from 'react-icons/fi'
import { usePvPConnection } from '@/hooks/usePvPConnection'

interface PvPArenaProps {
  playerFid: number
  playerName: string
  playerAvatar?: string
}

export default function PvPArenaNew({ playerFid, playerName, playerAvatar }: PvPArenaProps) {
  const {
    rooms,
    selectedRoom,
    isConnected,
    connectionStatus,
    error,
    lastHeartbeat,
    connectionId,
    joinRoom,
    leaveRoom,
    setReady
  } = usePvPConnection({
    playerFid,
    playerName,
    playerAvatar,
    autoReconnect: true,
    heartbeatInterval: 10000
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleJoinRoom = async (roomId: number) => {
    setIsLoading(true)
    try {
      await joinRoom(roomId)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveRoom = async () => {
    setIsLoading(true)
    try {
      await leaveRoom()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetReady = async (isReady: boolean) => {
    setIsLoading(true)
    try {
      await setReady(isReady)
    } finally {
      setIsLoading(false)
    }
  }

  const getConnectionAge = (lastHeartbeat: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(lastHeartbeat).getTime()
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h`
  }

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case 'empty': return 'bg-gray-600 text-gray-100'
      case 'waiting': return 'bg-yellow-600 text-yellow-100'
      case 'full': return 'bg-blue-600 text-blue-100'
      case 'playing': return 'bg-green-600 text-green-100'
      default: return 'bg-gray-600 text-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            PvP Arena
          </h1>
          <p className="text-gray-400 mt-2">Challenge other players in real-time battles</p>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400' :
                connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-sm">
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
              {lastHeartbeat && (
                <span className="text-xs text-gray-400">
                  Last heartbeat: {lastHeartbeat.toLocaleTimeString()}
                </span>
              )}
            </div>
            
            {error && (
              <div className="text-red-400 text-sm">
                <FiWifiOff className="inline mr-1" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`bg-gray-800 rounded-lg p-4 border-2 transition-all duration-300 ${
                selectedRoom?.id === room.id
                  ? 'border-purple-400 shadow-lg shadow-purple-400/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-purple-400">{room.name}</h3>
                <p className="text-sm text-gray-400">Stake: {room.stake.toLocaleString()}</p>
              </div>

              {/* Room Status */}
              <div className="mb-4">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  room.status === 'empty' ? 'bg-gray-600 text-gray-300' :
                  room.status === 'waiting' ? 'bg-yellow-600 text-yellow-100' :
                  room.status === 'full' ? 'bg-blue-600 text-blue-100' :
                  'bg-green-600 text-green-100'
                }`}>
                  <FiZap className="mr-1" />
                  {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                </div>
              </div>

              {/* Players */}
              <div className="space-y-2 mb-4">
                {room.player1 && (
                  <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <span className="text-sm">{room.player1.displayName}</span>
                    <div className="flex items-center gap-1">
                      {room.player1.isReady && <FiZap className="text-green-400" />}
                      <div className={`w-2 h-2 rounded-full ${
                        room.player1.isOnline ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                    </div>
                  </div>
                )}
                
                {room.player2 && (
                  <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                    <span className="text-sm">{room.player2.displayName}</span>
                    <div className="flex items-center gap-1">
                      {room.player2.isReady && <FiZap className="text-green-400" />}
                      <div className={`w-2 h-2 rounded-full ${
                        room.player2.isOnline ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {selectedRoom?.id === room.id ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleSetReady(!selectedRoom.player1?.isReady)}
                    disabled={isLoading}
                    className={`w-full py-2 px-4 rounded font-medium transition-colors disabled:opacity-50 ${
                      selectedRoom.player1?.isReady
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isLoading ? 'Loading...' : selectedRoom.player1?.isReady ? 'Not Ready' : 'Ready'}
                  </button>
                  <button
                    onClick={handleLeaveRoom}
                    disabled={isLoading}
                    className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Leave Room'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={room.status === 'full' || room.status === 'playing' || isLoading}
                  className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                    room.status === 'empty' || room.status === 'waiting'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  } disabled:opacity-50`}
                >
                  {isLoading ? 'Loading...' : 
                   room.status === 'empty' ? 'Join Room' :
                   room.status === 'waiting' ? 'Join Waiting' :
                   'Room Full'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Connection Info */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Connection Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Connection ID:</span>
              <p className="font-mono text-xs bg-gray-700 p-2 rounded mt-1">{connectionId}</p>
            </div>
            <div>
              <span className="text-gray-400">Player FID:</span>
              <p className="font-mono">{playerFid}</p>
            </div>
            <div>
              <span className="text-gray-400">Heartbeat Interval:</span>
              <p className="font-mono">10 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

