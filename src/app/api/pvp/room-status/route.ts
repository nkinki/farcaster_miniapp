import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({
        success: false,
        error: "Room ID is required"
      }, { status: 400 })
    }

    // Call the rooms-status API to get room info
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pvp/rooms-status`)
    const data = await response.json()

    if (data.success) {
      const room = data.rooms.find((r: { id: number }) => r.id === parseInt(roomId))

      if (room) {
        return NextResponse.json({
          success: true,
          room: room
        })
      } else {
        return NextResponse.json({
          success: false,
          error: "Room not found"
        }, { status: 404 })
      }
    } else {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch rooms"
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Room Status] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch room status"
    }, { status: 500 })
  }
}
