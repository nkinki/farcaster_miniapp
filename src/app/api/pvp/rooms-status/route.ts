import { NextRequest, NextResponse } from 'next/server'
import { rooms, type Room, type RoomPlayer } from './types'

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
    const body = await request.json()
    const { action, roomId, playerFid, playerName, playerAvatar, isReady } = body

    switch (action) {
      case 'join':
        return handleJoinRoom(roomId, playerFid, playerName, playerAvatar)
      case 'leave':
        return handleLeaveRoom(roomId, playerFid)
      case 'set_ready':
        return handleSetReady(roomId, playerFid, isReady)
      case 'update_status':
        const { status, gameId } = body
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
    return NextResponse.json({
      success: false,
      error: "Room not found"
    }, { status: 404 })
  }

  // Check if player is already in this room
  if (room.player1?.fid === playerFid || room.player2?.fid === playerFid) {
    return NextResponse.json({
      success: false,
      error: "Player already in this room"
    }, { status: 400 })
  }

  if (room.status === 'full' || room.status === 'playing') {
    return NextResponse.json({
      success: false,
      error: "Room is not available"
    }, { status: 400 })
  }

  const player: RoomPlayer = { 
    fid: playerFid, 
    displayName: playerName, 
    avatar: playerAvatar,
    isReady: false
  }

  if (room.status === 'empty') {
    room.player1 = player
    room.status = 'waiting'
    room.createdAt = new Date()
    console.log(`[Rooms] Player ${playerName} joined room ${roomId} as Player 1. Status: ${room.status}`)
  } else if (room.status === 'waiting' && !room.player2) {
    room.player2 = player
    room.status = 'full'
    console.log(`[Rooms] Player ${playerName} joined room ${roomId} as Player 2. Status: ${room.status}`)
  }

  return NextResponse.json({
    success: true,
    room: room,
    message: `Successfully joined room ${room.name}`
  })
}

function handleLeaveRoom(roomId: number, playerFid: number) {
  const room = rooms.find(r => r.id === roomId)
  if (!room) {
    return NextResponse.json({
      success: false,
      error: "Room not found"
    }, { status: 404 })
  }

  let playerName = "Unknown"
  
  // Remove player and update room status
  if (room.player1?.fid === playerFid) {
    playerName = room.player1.displayName
    room.player1 = undefined
    console.log(`[Rooms] Player 1 (${playerName}) left room ${roomId}`)
  } else if (room.player2?.fid === playerFid) {
    playerName = room.player2.displayName
    room.player2 = undefined
    console.log(`[Rooms] Player 2 (${playerName}) left room ${roomId}`)
  } else {
    return NextResponse.json({
      success: false,
      error: "Player not found in room"
    }, { status: 404 })
  }

  // Update room status based on remaining players
  if (!room.player1 && !room.player2) {
    room.status = 'empty'
    room.createdAt = undefined
    room.gameId = undefined
    console.log(`[Rooms] Room ${roomId} is now empty`)
  } else if (room.status === 'full' && (!room.player1 || !room.player2)) {
    room.status = 'waiting'
    console.log(`[Rooms] Room ${roomId} status changed to 'waiting'`)
  } else if (room.status === 'playing') {
    room.status = 'full'
    console.log(`[Rooms] Room ${roomId} status reverted to 'full' from 'playing'`)
  }

  return NextResponse.json({
    success: true,
    room: room,
    message: "Successfully left room"
  })
}

function handleSetReady(roomId: number, playerFid: number, isReady: boolean) {
  const room = rooms.find(r => r.id === roomId)
  if (!room) {
    return NextResponse.json({
      success: false,
      error: "Room not found"
    }, { status: 404 })
  }

  // Find and update the player's ready state
  if (room.player1?.fid === playerFid) {
    room.player1.isReady = isReady
    console.log(`[Rooms] Player 1 (${room.player1.displayName}) ready state set to ${isReady} in room ${roomId}`)
  } else if (room.player2?.fid === playerFid) {
    room.player2.isReady = isReady
    console.log(`[Rooms] Player 2 (${room.player2.displayName}) ready state set to ${isReady} in room ${roomId}`)
  } else {
    return NextResponse.json({
      success: false,
      error: "Player not found in room"
    }, { status: 404 })
  }

  // Check if both players are ready and update room status
  if (room.player1?.isReady && room.player2?.isReady && room.status === 'full') {
    room.status = 'playing'
    console.log(`[Rooms] Both players ready in room ${roomId}! Status updated to: ${room.status}`)
  } else if (room.status === 'playing' && (!room.player1?.isReady || !room.player2?.isReady)) {
    room.status = 'full'
    console.log(`[Rooms] Room ${roomId} status reverted to 'full' - not all players ready`)
  }

  return NextResponse.json({
    success: true,
    room: room,
    message: `Ready state updated to ${isReady}`
  })
}

function handleUpdateStatus(roomId: number, status: string, gameId?: string) {
  const room = rooms.find(r => r.id === roomId)
  if (!room) {
    return NextResponse.json({
      success: false,
      error: "Room not found"
    }, { status: 404 })
  }

  room.status = status as Room['status']
  if (gameId) room.gameId = gameId

  console.log(`[Rooms] Room ${roomId} status updated to: ${status}`)

  return NextResponse.json({
    success: true,
    room: room,
    message: "Room status updated"
  })
}
