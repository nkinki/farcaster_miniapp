import { NextRequest, NextResponse } from 'next/server'
import { rooms } from '../rooms-status/route'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, playerFid } = body

    if (!roomId || !playerFid) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 })
    }

    const room = rooms.find(r => r.id === roomId)
    if (!room) {
      return NextResponse.json({
        success: false,
        error: 'Room not found'
      }, { status: 404 })
    }

    // Verify player is in the room
    if (room.player1?.fid !== playerFid && room.player2?.fid !== playerFid) {
      return NextResponse.json({
        success: false,
        error: 'Player not in room'
      }, { status: 403 })
    }

    // Check if both players are ready
    if (!room.player1?.isReady || !room.player2?.isReady) {
      return NextResponse.json({
        success: false,
        error: 'Both players must be ready to start game'
      }, { status: 400 })
    }

    // Check if room is in correct state
    if (room.status !== 'full') {
      return NextResponse.json({
        success: false,
        error: 'Room is not in correct state to start game'
      }, { status: 400 })
    }

    // Update room status to playing
    room.status = 'playing'
    room.gameId = `game_${roomId}_${Date.now()}`

    console.log(`[Start Game] Game started in room ${roomId} with players: ${room.player1?.displayName} vs ${room.player2?.displayName}`)

    return NextResponse.json({
      success: true,
      room: room,
      gameId: room.gameId,
      message: 'Game started successfully'
    })

  } catch (error) {
    console.error('[Start Game] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
