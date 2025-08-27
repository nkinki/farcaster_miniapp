import { useState, useEffect, useCallback, useRef } from 'react'

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

interface UsePvPConnectionProps {
  playerFid: number
  playerName: string
  playerAvatar?: string
  autoReconnect?: boolean
  heartbeatInterval?: number
}

export function usePvPConnection({
  playerFid,
  playerName,
  playerAvatar,
  autoReconnect = true,
  heartbeatInterval = 10000
}: UsePvPConnectionProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null)
  
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectRef = useRef<NodeJS.Timeout | null>(null)
  const connectionId = useRef(`conn_${playerFid}_${Date.now()}`)

  // Fetch rooms status
  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch('/api/pvp/rooms-status')
      const data = await response.json()
      
      if (data.success) {
        setRooms(data.rooms)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch rooms')
      }
    } catch (err) {
      setError('Network error while fetching rooms')
      console.error('Error fetching rooms:', err)
    }
  }, [])

  // Send heartbeat to maintain connection
  const sendHeartbeat = useCallback(async (roomId: number) => {
    try {
      const response = await fetch('/api/pvp/rooms-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'heartbeat',
          roomId,
          playerFid,
          connectionId: connectionId.current
        })
      })

      const data = await response.json()
      if (data.success) {
        setLastHeartbeat(new Date())
        setConnectionStatus('connected')
        setError(null)
      } else {
        setConnectionStatus('disconnected')
        setError(data.error || 'Heartbeat failed')
      }
    } catch (err) {
      setConnectionStatus('disconnected')
      setError('Network error during heartbeat')
      console.error('Heartbeat error:', err)
    }
  }, [playerFid])

  // Start heartbeat for a room
  const startHeartbeat = useCallback((roomId: number) => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
    }
    
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat(roomId)
    }, heartbeatInterval)
  }, [sendHeartbeat, heartbeatInterval])

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  // Join room
  const joinRoom = useCallback(async (roomId: number) => {
    try {
      setConnectionStatus('connecting')
      setError(null)

      const response = await fetch('/api/pvp/rooms-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomId,
          playerFid,
          playerName,
          playerAvatar,
          connectionId: connectionId.current
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSelectedRoom(data.room)
        setIsConnected(true)
        setConnectionStatus('connected')
        
        // Start heartbeat
        startHeartbeat(roomId)
        
        // Fetch updated rooms
        fetchRooms()
      } else {
        setConnectionStatus('disconnected')
        setError(data.error || 'Failed to join room')
      }
    } catch (err) {
      setConnectionStatus('disconnected')
      setError('Network error while joining room')
      console.error('Join room error:', err)
    }
  }, [playerFid, playerName, playerAvatar, startHeartbeat, fetchRooms])

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!selectedRoom) return

    try {
      const response = await fetch('/api/pvp/rooms-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          roomId: selectedRoom.id,
          playerFid
        })
      })

      if (response.ok) {
        // Stop heartbeat
        stopHeartbeat()
        
        setIsConnected(false)
        setSelectedRoom(null)
        setConnectionStatus('disconnected')
        setLastHeartbeat(null)
        
        // Fetch updated rooms
        fetchRooms()
      }
    } catch (err) {
      console.error('Leave room error:', err)
    }
  }, [selectedRoom, playerFid, stopHeartbeat, fetchRooms])

  // Set ready status
  const setReady = useCallback(async (isReady: boolean) => {
    if (!selectedRoom) return

    try {
      const response = await fetch('/api/pvp/rooms-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_ready',
          roomId: selectedRoom.id,
          playerFid,
          isReady
        })
      })

      if (response.ok) {
        // Fetch updated rooms to get new status
        fetchRooms()
      }
    } catch (err) {
      console.error('Set ready error:', err)
    }
  }, [selectedRoom, playerFid, fetchRooms])

  // Auto-reconnect logic
  useEffect(() => {
    if (autoReconnect && connectionStatus === 'disconnected' && selectedRoom && isConnected) {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
      }
      
      reconnectRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        sendHeartbeat(selectedRoom.id)
      }, 5000)
    }

    return () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
      }
    }
  }, [autoReconnect, connectionStatus, selectedRoom, isConnected, sendHeartbeat])

  // Initial setup and cleanup
  useEffect(() => {
    fetchRooms()
    
    // Fetch rooms every 5 seconds to keep UI updated
    const roomsInterval = setInterval(fetchRooms, 5000)
    
    return () => {
      clearInterval(roomsInterval)
      stopHeartbeat()
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
      }
    }
  }, [fetchRooms, stopHeartbeat])

  return {
    rooms,
    selectedRoom,
    isConnected,
    connectionStatus,
    error,
    lastHeartbeat,
    connectionId: connectionId.current,
    joinRoom,
    leaveRoom,
    setReady,
    fetchRooms,
    startHeartbeat,
    stopHeartbeat
  }
}
