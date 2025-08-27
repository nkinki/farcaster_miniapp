export interface RoomPlayer {
  fid: number
  displayName: string
  avatar?: string
  isReady: boolean
  lastHeartbeat: Date
  isOnline: boolean
  connectionId?: string
}

export interface Room {
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

// Shared rooms array with improved connection management
export const rooms: Room[] = [
  { id: 1, name: "Alpha Arena", status: 'empty', stake: 10000, lastActivity: new Date() },
  { id: 2, name: "Beta Battle", status: 'empty', stake: 10000, lastActivity: new Date() },
  { id: 3, name: "Gamma Ground", status: 'empty', stake: 10000, lastActivity: new Date() },
  { id: 4, name: "Delta Dome", status: 'empty', stake: 10000, lastActivity: new Date() }
]

// Connection timeout constants
export const CONNECTION_TIMEOUT = 30000 // 30 seconds
export const HEARTBEAT_INTERVAL = 10000 // 10 seconds
