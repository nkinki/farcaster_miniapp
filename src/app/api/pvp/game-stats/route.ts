import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Mock data for now - production-ben database
    const totalGames = 42 // Mock value
    
    return NextResponse.json({
      success: true,
      totalGames: totalGames
    })
  } catch (error) {
    console.error('[Game Stats] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch game stats"
    }, { status: 500 })
  }
}
