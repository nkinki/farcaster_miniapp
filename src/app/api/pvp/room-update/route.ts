import { NextRequest, NextResponse } from 'next/server'
import { rooms } from '../rooms-status/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, playerFid, action, data, connectionId } = body

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

    // Update player heartbeat and online status
    const now = new Date()
    if (room.player1 && room.player1.fid === playerFid) {
      room.player1.lastHeartbeat = now
      room.player1.isOnline = true
      if (connectionId) room.player1.connectionId = connectionId
    } else if (room.player2 && room.player2.fid === playerFid) {
      room.player2.lastHeartbeat = now
      room.player2.isOnline = true
      if (connectionId) room.player2.connectionId = connectionId
    }
    
    room.lastActivity = now

    switch (action) {
      case 'ping':
        // Simple ping to keep connection alive and get room status
        return NextResponse.json({
          success: true,
          room: room,
          timestamp: now.toISOString(),
          message: 'Ping successful - connection maintained'
        })

      case 'heartbeat':
        // Explicit heartbeat to maintain connection
        return NextResponse.json({
          success: true,
          room: room,
          timestamp: now.toISOString(),
          message: 'Heartbeat received - connection active',
          nextHeartbeat: new Date(now.getTime() + 10000).toISOString() // 10 seconds
        })

      case 'get_opponent_status':
        // Get opponent's current status
        const opponent = room.player1?.fid === playerFid ? room.player2 : room.player1
        return NextResponse.json({
          success: true,
          opponent: opponent,
          roomStatus: room.status,
          timestamp: now.toISOString(),
          opponentOnline: opponent?.isOnline || false,
          lastOpponentHeartbeat: opponent?.lastHeartbeat?.toISOString()
        })

      case 'get_room_info':
        // Get detailed room information
        return NextResponse.json({
          success: true,
          room: room,
          timestamp: now.toISOString(),
          player1Online: room.player1?.isOnline || false,
          player2Online: room.player2?.isOnline || false,
          lastActivity: room.lastActivity?.toISOString()
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
