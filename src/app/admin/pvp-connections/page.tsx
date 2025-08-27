"use client"

import { useState, useEffect } from 'react'
import { FiRefreshCw, FiTrash2, FiWifi, FiWifiOff, FiUsers, FiClock, FiZap } from 'react-icons/fi'

interface RoomPlayer {
  fid: number
  displayName: string
  avatar?: string
  isReady: boolean
  lastHeartbeat: Date
  isOnline: boolean
  connectionId?: string
}

interface Room {
  id: number
  name: string
  player1?: RoomPlayer
  player2?: RoomPlayer
  status: 'empty' | 'waiting' | 'full' | 'playing'
  stake: number
  createdAt?: Date
  gameId?: string
  lastActivity: Date
}

interface CleanupStats {
  totalRooms: number
  activeConnections: number
  timedOutConnections: number
  cleanedRooms: number
}

export default function PvPConnectionsAdmin() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [cleanupStats, setCleanupStats] = useState<CleanupStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  // Fetch rooms status
  const fetchRooms = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/pvp/rooms-status')
      const data = await response.json()
      
      if (data.success) {
        setRooms(data.rooms)
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Perform connection health check
  const performHealthCheck = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/pvp/connection-manager')
      const data = await response.json()
      
      if (data.success) {
        setCleanupStats(data.cleanupStats)
        // Refresh rooms after cleanup
        await fetchRooms()
      }
    } catch (error) {
      console.error('Error performing health check:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Force cleanup specific room
  const forceCleanupRoom = async (roomId: number) => {
    try {
      const response = await fetch('/api/pvp/connection-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force_cleanup',
          roomId
        })
      })

      const data = await response.json()
      if (data.success) {
        // Refresh rooms after cleanup
        await fetchRooms()
        alert(`Room ${roomId} cleaned successfully`)
      }
    } catch (error) {
      console.error('Error cleaning room:', error)
      alert('Error cleaning room')
    }
  }

  // Force cleanup all rooms
  const forceCleanupAll = async () => {
    if (!confirm('Are you sure you want to clean all rooms? This will disconnect all players.')) {
      return
    }

    try {
      const response = await fetch('/api/pvp/connection-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force_cleanup'
        })
      })

      const data = await response.json()
      if (data.success) {
        // Refresh rooms after cleanup
        await fetchRooms()
        alert(`All ${data.roomsCleaned} rooms cleaned successfully`)
      }
    } catch (error) {
      console.error('Error cleaning all rooms:', error)
      alert('Error cleaning all rooms')
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchRooms()
  }, [])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchRooms, 10000)
    return () => clearInterval(interval)
  }, [])

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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            PvP Connections Admin
          </h1>
          <p className="text-gray-400 mt-2">Monitor and manage PvP room connections</p>
        </div>

        {/* Control Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={fetchRooms}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
                Refresh Rooms
              </button>
              
              <button
                onClick={performHealthCheck}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors disabled:opacity-50"
              >
                <FiZap />
                Health Check
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={forceCleanupAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
              >
                <FiTrash2 />
                Clean All Rooms
              </button>
            </div>
          </div>

          {/* Stats */}
          {cleanupStats && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{cleanupStats.totalRooms}</div>
                <div className="text-sm text-gray-400">Total Rooms</div>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{cleanupStats.activeConnections}</div>
                <div className="text-sm text-gray-400">Active Connections</div>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{cleanupStats.timedOutConnections}</div>
                <div className="text-sm text-gray-400">Timed Out</div>
              </div>
              <div className="bg-gray-700 rounded p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{cleanupStats.cleanedRooms}</div>
                <div className="text-sm text-gray-400">Cleaned Rooms</div>
              </div>
            </div>
          )}

          {lastRefresh && (
            <div className="mt-4 text-sm text-gray-400">
              Last refresh: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`bg-gray-800 rounded-lg p-6 border-2 transition-all duration-300 ${
                selectedRoom?.id === room.id
                  ? 'border-purple-400 shadow-lg shadow-purple-400/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedRoom(room)}
            >
              {/* Room Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-purple-400">{room.name}</h3>
                  <p className="text-sm text-gray-400">Stake: {room.stake.toLocaleString()}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoomStatusColor(room.status)}`}>
                    <FiZap className="mr-1" />
                    {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      forceCleanupRoom(room.id)
                    }}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                    title="Force cleanup room"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Room Activity */}
              <div className="mb-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <FiClock />
                  Last activity: {room.lastActivity ? new Date(room.lastActivity).toLocaleTimeString() : 'Never'}
                </div>
                {room.createdAt && (
                  <div className="flex items-center gap-2 mt-1">
                    <FiUsers />
                    Created: {new Date(room.createdAt).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* Players */}
              <div className="space-y-3">
                {room.player1 && (
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${room.player1.isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div>
                        <div className="font-medium">{room.player1.displayName}</div>
                        <div className="text-xs text-gray-400">FID: {room.player1.fid}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      {room.player1.isReady && (
                        <span className="text-green-400">
                          <FiZap />
                        </span>
                      )}
                      <span className="text-gray-400">
                        {getConnectionAge(room.player1.lastHeartbeat)}
                      </span>
                      {room.player1.connectionId && (
                        <span className="text-xs text-gray-500 font-mono">
                          {room.player1.connectionId.slice(-8)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {room.player2 && (
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${room.player2.isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div>
                        <div className="font-medium">{room.player2.displayName}</div>
                        <div className="text-xs text-gray-400">FID: {room.player2.fid}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      {room.player2.isReady && (
                        <span className="text-green-400">
                          <FiZap />
                        </span>
                      )}
                      <span className="text-gray-400">
                        {getConnectionAge(room.player2.lastHeartbeat)}
                      </span>
                      {room.player2.connectionId && (
                        <span className="text-xs text-gray-500 font-mono">
                          {room.player2.connectionId.slice(-8)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {!room.player1 && !room.player2 && (
                  <div className="text-center py-6 text-gray-500">
                    <FiUsers size={24} className="mx-auto mb-2" />
                    No players in room
                  </div>
                )}
              </div>

              {/* Game Info */}
              {room.gameId && (
                <div className="mt-4 p-3 bg-blue-600/20 rounded border border-blue-600/30">
                  <div className="text-sm text-blue-300">
                    <strong>Game ID:</strong> {room.gameId}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Connection Info */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Connection Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Heartbeat Interval:</span>
              <p className="font-mono">10 seconds</p>
            </div>
            <div>
              <span className="text-gray-400">Connection Timeout:</span>
              <p className="font-mono">30 seconds</p>
            </div>
            <div>
              <span className="text-gray-400">Auto-refresh:</span>
              <p className="font-mono">10 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
