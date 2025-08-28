import { NextRequest, NextResponse } from 'next/server'

interface RoomPlayer {
  user: {
    fid: number
    name: string
    avatar?: string
  }
  isReady: boolean
  hasStaked: boolean
}

interface Room {
  id: number
  name: string
  players: RoomPlayer[]
  status: 'empty' | 'waiting' | 'ready' | 'playing'
  stake: number
  maxPlayers: number
  createdAt?: Date
  gameId?: string
}

// In-memory storage for rooms (production-ben database)
const rooms: Room[] = [
  { id: 1, name: "Alpha Arena", players: [], status: 'empty', stake: 10000, maxPlayers: 2 },
  { id: 2, name: "Beta Battle", players: [], status: 'empty', stake: 10000, maxPlayers: 2 },
  { id: 3, name: "Gamma Ground", players: [], status: 'empty', stake: 10000, maxPlayers: 2 },
  { id: 4, name: "Delta Dome", players: [], status: 'empty', stake: 10000, maxPlayers: 2 }
]

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      rooms: rooms
    })
  } catch (error) {
    console.error('[Rooms Status] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch rooms status"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, roomId, playerFid, playerName, playerAvatar } = await request.json()

    switch (action) {
      case 'join':
        return handleJoinRoom(roomId, playerFid, playerName, playerAvatar)
      case 'leave':
        return handleLeaveRoom(roomId, playerFid)
      case 'ready':
        return handleReady(roomId, playerFid)
      case 'start':
        return handleStartGame(roomId, playerFid)
      case 'update_status':
        const { status, gameId } = await request.json()
        return handleUpdateStatus(roomId, status, gameId)
      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action"
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[Rooms Status] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to process room action"
    }, { status: 500 })
  }
}

function handleJoinRoom(roomId: number, playerFid: number, playerName: string, playerAvatar?: string) {
  const room = rooms.find(r => r.id === roomId)
  if (!room) {
    return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 })
  }

  if (room.players.length >= room.maxPlayers) {
    return NextResponse.json({ success: false, error: "Room is full" }, { status: 400 })
  }

  if (room.players.some(p => p.user.fid === playerFid)) {
    return NextResponse.json({ success: false, error: "Player already in room" }, { status: 400 })
  }

  room.players.push({ user: { fid: playerFid, name: playerName, avatar: playerAvatar }, isReady: false, hasStaked: false })
  room.status = room.players.length === room.maxPlayers ? 'ready' : 'waiting'
  if (!room.createdAt) room.createdAt = new Date()

  console.log(`[Rooms] Player ${playerName} joined room ${roomId}. Status: ${room.status}`)
  return NextResponse.json({ success: true, room: room, message: `Successfully joined room ${room.name}` })
}

function handleLeaveRoom(roomId: number, playerFid: number) {
  const room = rooms.find(r => r.id === roomId)
  if (!room) {
    return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 })
  }

  room.players = room.players.filter(p => p.user.fid !== playerFid)
  room.status = room.players.length === 0 ? 'empty' : 'waiting'
  if (room.players.length === 0) {
    room.createdAt = undefined
    room.gameId = undefined
  }

  console.log(`[Rooms] Player ${playerFid} left room ${roomId}. Status: ${room.status}`)
  return NextResponse.json({ success: true, room: room, message: "Successfully left room" })
}

function handleReady(roomId: number, playerFid: number) {
  const room = rooms.find(r => r.id === roomId)
  if (!room) {
    return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 })
  }

  const player = room.players.find(p => p.user.fid === playerFid)
  if (player) {
    player.isReady = true
    if (room.players.filter(p => p.isReady).length === room.maxPlayers) {
      room.status = 'ready'
    }
  }

  console.log(`[Rooms] Player ${playerFid} is ready in room ${roomId}. Status: ${room.status}`)
  return NextResponse.json({ success: true, room: room, message: "Player is ready" })
}

function handleStartGame(roomId: number, playerFid: number) {
  const room = rooms.find(r => r.id === roomId)
  if (!room) {
    return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 })
  }

  if (room.players.filter(p => p.isReady).length !== room.maxPlayers) {
    return NextResponse.json({ success: false, error: "Not all players are ready" }, { status: 400 })
  }

  room.status = 'playing'
  room.gameId = `game-${Date.now()}` // Generate a new game ID
  room.players.forEach(p => p.hasStaked = true) // Assume staking happens here

  console.log(`[Rooms] Game started in room ${roomId}. Game ID: ${room.gameId}`)
  return NextResponse.json({ success: true, room: room, message: "Game started" })
}

function handleUpdateStatus(roomId: number, status: string, gameId?: string) {
  const room = rooms.find(r => r.id === roomId)
  if (!room) {
    return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 })
  }

  room.status = status as Room['status']
  if (gameId) room.gameId = gameId

  console.log(`[Rooms] Room ${roomId} status updated to: ${status}`)
  return NextResponse.json({ success: true, room: room, message: "Room status updated" })
}
