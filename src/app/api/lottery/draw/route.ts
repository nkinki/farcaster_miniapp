import { NextRequest, NextResponse } from 'next/server'
import { LotteryDraw } from '@/types/lottery'

// In-memory storage (később adatbázis)
let draws: LotteryDraw[] = []
let drawIdCounter = 1

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'perform_draw') {
      // Véletlenszám generálás 1-100 között
      const winningNumber = Math.floor(Math.random() * 100) + 1
      
      // Új húzás létrehozása
      const newDraw: LotteryDraw = {
        id: drawIdCounter++,
        drawNumber: drawIdCounter,
        winningNumber,
        jackpot: 1000000, // 1M CHESS alap
        totalTickets: 0,
        winners: [],
        status: 'completed',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 óra ezelőtt
        endTime: new Date(),
        createdAt: new Date()
      }

      draws.push(newDraw)

      return NextResponse.json({
        success: true,
        draw: newDraw,
        message: `Draw completed! Winning number: ${winningNumber}`
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('[Draw] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform draw'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const activeDraws = draws.filter(draw => draw.status === 'active')
    const completedDraws = draws.filter(draw => draw.status === 'completed')
    
    return NextResponse.json({
      success: true,
      activeDraws,
      completedDraws,
      total: draws.length
    })
  } catch (error) {
    console.error('[Get Draws] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch draws'
    }, { status: 500 })
  }
}
