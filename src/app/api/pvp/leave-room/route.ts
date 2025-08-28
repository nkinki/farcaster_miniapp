import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { roomId, playerFid } = await request.json()

    if (!roomId || !playerFid) {
      return NextResponse.json({
        success: false,
        error: "Room ID and player FID are required"
      }, { status: 400 })
    }

    // Call the rooms-status API to leave the room
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pvp/rooms-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'leave',
        roomId: roomId,
        playerFid: playerFid
      })
    })

    const data = await response.json()

    if (data.success) {
      return NextResponse.json({
        success: true,
        message: "Successfully left room"
      })
    } else {
      return NextResponse.json({
        success: false,
        error: data.error || "Failed to leave room"
      }, { status: 400 })
    }

  } catch (error) {
    console.error('[Leave Room] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to leave room"
    }, { status: 500 })
  }
}
