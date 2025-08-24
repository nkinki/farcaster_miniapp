export interface RoomPlayer {
  fid: number
  displayName: string
  avatar?: string
  isReady: boolean
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
}

// Shared rooms array
export const rooms: Room[] = [
  { id: 1, name: "Alpha Arena", status: 'empty', stake: 10000 },
  { id: 2, name: "Beta Battle", status: 'empty', stake: 10000 },
  { id: 3, name: "Gamma Ground", status: 'empty', stake: 10000 },
  { id: 4, name: "Delta Dome", status: 'empty', stake: 10000 }
]
