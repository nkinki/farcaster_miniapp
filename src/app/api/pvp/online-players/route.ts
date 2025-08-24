import { NextResponse } from 'next/server'

// In-memory storage for online players (production-ben database)
let onlinePlayersCount = 25

export async function GET() {
  try {
    // Simulálunk egy reális online játékos számot (15-35 között)
    const randomVariation = Math.floor(Math.random() * 20) - 10
    const currentCount = Math.max(15, Math.min(35, onlinePlayersCount + randomVariation))
    
    return NextResponse.json({
      success: true,
      count: currentCount,
      message: 'Online players count retrieved successfully'
    })
  } catch (error) {
    console.error('[Online Players] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get online players count'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'connect':
        onlinePlayersCount = Math.min(50, onlinePlayersCount + 1)
        break
      case 'disconnect':
        onlinePlayersCount = Math.max(10, onlinePlayersCount - 1)
        break
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      count: onlinePlayersCount,
      message: `Player ${action === 'connect' ? 'connected' : 'disconnected'}`
    })

  } catch (error) {
    console.error('[Online Players] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update online players count'
    }, { status: 500 })
  }
}

// Ez a sor biztosítja, hogy a Vercel ne cache-elje az API választ
export const dynamic = 'force-dynamic'
