import { NextRequest, NextResponse } from 'next/server'
import { rooms, CONNECTION_TIMEOUT, HEARTBEAT_INTERVAL } from '../rooms-status/types'

// Connection health check and cleanup
export async function GET() {
  try {
    const now = new Date()
    let cleanupStats = {
      totalRooms: rooms.length,
      activeConnections: 0,
      timedOutConnections: 0,
      cleanedRooms: 0
    }

    // Cleanup inactive connections
    rooms.forEach(room => {
      let roomCleaned = false
      
      // Check player1 connection
      if (room.player1) {
        if ((now.getTime() - room.player1.lastHeartbeat.getTime()) > CONNECTION_TIMEOUT) {
          console.log(`[Connection Manager] Player 1 (${room.player1.displayName}) connection timeout in room ${room.id}`)
          room.player1 = undefined
          cleanupStats.timedOutConnections++
          roomCleaned = true
        } else {
          cleanupStats.activeConnections++
        }
      }
      
      // Check player2 connection
      if (room.player2) {
        if ((now.getTime() - room.player2.lastHeartbeat.getTime()) > CONNECTION_TIMEOUT) {
          console.log(`[Connection Manager] Player 2 (${room.player2.displayName}) connection timeout in room ${room.id}`)
          room.player2 = undefined
          cleanupStats.timedOutConnections++
          roomCleaned = true
        } else {
          cleanupStats.activeConnections++
        }
      }
      
      // Update room status based on remaining players
      if (!room.player1 && !room.player2) {
        if (room.status !== 'empty') {
          room.status = 'empty'
          room.createdAt = undefined
          room.gameId = undefined
          console.log(`[Connection Manager] Room ${room.id} status reset to empty`)
          roomCleaned = true
        }
      } else if (room.status === 'full' && (!room.player1 || !room.player2)) {
        room.status = 'waiting'
        console.log(`[Connection Manager] Room ${room.id} status changed to waiting`)
        roomCleaned = true
      } else if (room.status === 'playing' && (!room.player1 || !room.player2)) {
        room.status = 'full'
        console.log(`[Connection Manager] Room ${room.id} status reverted to full from playing`)
        roomCleaned = true
      }
      
      if (roomCleaned) {
        cleanupStats.cleanedRooms++
      }
      
      // Update room activity
      room.lastActivity = now
    })

    return NextResponse.json({
      success: true,
      cleanupStats,
      timestamp: now.toISOString(),
      connectionTimeout: CONNECTION_TIMEOUT,
      heartbeatInterval: HEARTBEAT_INTERVAL,
      message: 'Connection health check completed'
    })

  } catch (error) {
    console.error('[Connection Manager] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform connection health check'
    }, { status: 500 })
  }
}

// Manual connection cleanup trigger
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, roomId, playerFid } = body

    if (action === 'force_cleanup') {
      // Force cleanup specific room or all rooms
      if (roomId) {
        // Cleanup specific room
        const room = rooms.find(r => r.id === roomId)
        if (room) {
          room.player1 = undefined
          room.player2 = undefined
          room.status = 'empty'
          room.createdAt = undefined
          room.gameId = undefined
          room.lastActivity = new Date()
          
          return NextResponse.json({
            success: true,
            message: `Room ${roomId} force cleaned`,
            room: room
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Room not found'
          }, { status: 404 })
        }
      } else {
        // Cleanup all rooms
        rooms.forEach(room => {
          room.player1 = undefined
          room.player2 = undefined
          room.status = 'empty'
          room.createdAt = undefined
          room.gameId = undefined
          room.lastActivity = new Date()
        })
        
        return NextResponse.json({
          success: true,
          message: 'All rooms force cleaned',
          roomsCleaned: rooms.length
        })
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('[Connection Manager] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform force cleanup'
    }, { status: 500 })
  }
}
