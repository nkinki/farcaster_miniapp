import { NextRequest, NextResponse } from 'next/server'

interface ReclaimableGame {
  id: number
  status: string
  stake: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerFid = searchParams.get("playerFid")

    if (!playerFid) {
      return NextResponse.json({
        success: false,
        error: "Player FID is required"
      }, { status: 400 })
    }

    // Mock data for now - production-ben database query
    const reclaimableGames: ReclaimableGame[] = []
    
    // Check if player has any expired games (mock logic)
    if (parseInt(playerFid) % 7 === 0) { // Mock: every 7th player has reclaimable games
      reclaimableGames.push({
        id: parseInt(playerFid) * 10 + 1,
        status: "expired",
        stake: 10000
      })
    }

    return NextResponse.json({
      success: true,
      reclaimableGames: reclaimableGames
    })
  } catch (error) {
    console.error('[Check Reclaimable Games] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check reclaimable games"
    }, { status: 500 })
  }
}
