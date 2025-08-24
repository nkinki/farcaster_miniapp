import { NextRequest, NextResponse } from 'next/server'
import { rooms, type Room } from '../rooms-status/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return NextResponse.json({
        success: false,
        error: 'Room ID is required'
      }, { status: 400 })
    }

    // Find the specific room directly from the local rooms array
    console.log(`[Room Status] Looking for room ${roomId} in local array`)
    const room = rooms.find((r: Room) => r.id === parseInt(roomId))

    if (!room) {
      return NextResponse.json({
        success: false,
        error: 'Room not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      room: room
    })

  } catch (error) {
    console.error('[Room Status] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}