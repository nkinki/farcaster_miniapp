import { NextResponse } from 'next/server'
import { lotteryStorage } from '@/lib/lotteryStorage'

export async function GET() {
  try {
    const stats = lotteryStorage.getStats()
    
    // Konvertálás a frontend típusokra
    const lotteryStats = {
      totalTickets: stats.totalTickets,
      activeTickets: stats.activeTickets,
      totalJackpot: stats.totalJackpot,
      nextDrawTime: new Date(stats.nextDrawTime),
      lastDrawNumber: stats.lastDrawNumber
    }
    
    return NextResponse.json({
      success: true,
      stats: lotteryStats
    })
  } catch (error) {
    console.error('[Lottery Stats] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch lottery stats'
    }, { status: 500 })
  }
}
