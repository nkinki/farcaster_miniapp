import { NextRequest, NextResponse } from 'next/server'
import { lotteryStorage } from '@/lib/lotteryStorage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerFid, playerAddress, playerName, playerAvatar, number, ticketCount = 1 } = body

    if (!playerFid || !playerAddress || !playerName || !number) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 })
    }

    if (number < 1 || number > 100) {
      return NextResponse.json({
        success: false,
        error: 'Number must be between 1-100'
      }, { status: 400 })
    }

    if (ticketCount < 1 || ticketCount > 100) {
      return NextResponse.json({
        success: false,
        error: 'Ticket count must be between 1-100'
      }, { status: 400 })
    }

    // Létrehozunk több sorsjegyet
    const newTickets = []
    for (let i = 0; i < ticketCount; i++) {
      const ticket = lotteryStorage.addTicket({
        playerFid,
        playerAddress,
        playerName,
        playerAvatar,
        number,
        drawId: 1,
        isActive: true,
        createdAt: new Date().toISOString()
      })
      newTickets.push(ticket)
    }
    
    // Statisztikák frissítése
    const currentStats = lotteryStorage.getStats()
    lotteryStorage.updateStats({
      totalTickets: currentStats.totalTickets + ticketCount,
      activeTickets: currentStats.activeTickets + ticketCount
    })

    return NextResponse.json({
      success: true,
      tickets: newTickets,
      message: `Successfully created ${ticketCount} ticket(s) for number ${number}`
    })

  } catch (error) {
    console.error('[Buy Ticket] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to buy ticket'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const activeTickets = lotteryStorage.getActiveTickets()
    
    // Konvertálás a frontend típusokra
    const tickets = activeTickets.map(ticket => ({
      ...ticket,
      createdAt: new Date(ticket.createdAt)
    }))

    return NextResponse.json({
      success: true,
      tickets,
      total: tickets.length
    })
  } catch (error) {
    console.error('[Get Tickets] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tickets'
    }, { status: 500 })
  }
}
