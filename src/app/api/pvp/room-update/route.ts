import { NextRequest, NextResponse } from 'next/server'
import { rooms } from '../rooms-status/route'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, playerFid, action, data } = body

    if (!roomId || !playerFid || !action) {
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

    switch (action) {
      case 'ping':
        // Simple ping to keep connection alive and get room status
        return NextResponse.json({
          success: true,
          room: room,
          timestamp: new Date().toISOString()
        })

      case 'get_opponent_status':
        // Get opponent's current status
        const opponent = room.player1?.fid === playerFid ? room.player2 : room.player1
        return NextResponse.json({
          success: true,
          opponent: opponent,
          roomStatus: room.status,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('[Room Update] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
