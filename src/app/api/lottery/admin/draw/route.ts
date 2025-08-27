import { NextRequest, NextResponse } from 'next/server'
import { lotteryStorage } from '@/lib/lotteryStorage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, adminKey } = body

    // Egyszerű admin kulcs ellenőrzés (később proper auth)
    if (adminKey !== 'farchess2024') {
      return NextResponse.json({
        success: false,
        error: 'Invalid admin key'
      }, { status: 403 })
    }

    if (action === 'perform_draw') {
      // Véletlenszám generálás 1-100 között
      const winningNumber = Math.floor(Math.random() * 100) + 1
      
      // Aktív húzás lekérése
      const currentDraw = lotteryStorage.getActiveDraw()
      
      if (!currentDraw) {
        return NextResponse.json({
          success: false,
          error: 'No active draw found'
        }, { status: 400 })
      }
      
      // Húzás befejezése
      lotteryStorage.updateDraw(currentDraw.id, {
        winningNumber,
        status: 'completed',
        endTime: new Date().toISOString()
      })
      
      // Nyertesek keresése
      const allTickets = lotteryStorage.getTickets()
      const winners = allTickets.filter(ticket => 
        ticket.drawId === currentDraw.id && 
        ticket.number === winningNumber && 
        ticket.isActive
      )
      
      // Ha nincs nyertes, a jackpot nő 70%-kal
      if (winners.length === 0) {
        const newJackpot = Math.floor(currentDraw.jackpot * 1.7)
        
        // Új húzás létrehozása
        const nextDrawNumber = currentDraw.drawNumber + 1
        lotteryStorage.addDraw({
          drawNumber: nextDrawNumber,
          winningNumber: 0,
          jackpot: newJackpot,
          totalTickets: 0,
          status: 'active',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        })
        
        // Statisztikák frissítése
        lotteryStorage.updateStats({
          totalJackpot: newJackpot,
          lastDrawNumber: currentDraw.drawNumber,
          nextDrawTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        
        return NextResponse.json({
          success: true,
          draw: {
            id: currentDraw.id,
            drawNumber: currentDraw.drawNumber,
            winningNumber,
            jackpot: currentDraw.jackpot,
            totalTickets: currentDraw.totalTickets,
            winners: [],
            status: 'completed',
            startTime: new Date(currentDraw.startTime),
            endTime: new Date(),
            createdAt: new Date(currentDraw.createdAt)
          },
          message: `Draw completed! Winning number: ${winningNumber}. No winners - jackpot increased to ${newJackpot.toLocaleString()} $CHESS!`
        })
      } else {
        // Nyertesek sorsjegyeinek passzívvá tétele
        winners.forEach(winner => {
          lotteryStorage.updateTicket(winner.id, { isActive: false })
        })
        
        // Statisztikák frissítése
        lotteryStorage.updateStats({
          activeTickets: 0,
          lastDrawNumber: currentDraw.drawNumber,
          nextDrawTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        
        // Új húzás létrehozása
        const nextDrawNumber = currentDraw.drawNumber + 1
        lotteryStorage.addDraw({
          drawNumber: nextDrawNumber,
          winningNumber: 0,
          jackpot: 1000000,
          totalTickets: 0,
          status: 'active',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        })
        
        return NextResponse.json({
          success: true,
          draw: {
            id: currentDraw.id,
            drawNumber: currentDraw.drawNumber,
            winningNumber,
            jackpot: currentDraw.jackpot,
            totalTickets: currentDraw.totalTickets,
            winners: winners.map(winner => ({
              ...winner,
              createdAt: new Date(winner.createdAt)
            })),
            status: 'completed',
            startTime: new Date(currentDraw.startTime),
            endTime: new Date(),
            createdAt: new Date(currentDraw.createdAt)
          },
          message: `Draw completed! Winning number: ${winningNumber}. ${winners.length} winner(s) found!`
        })
      }
    }

    if (action === 'reset_draw') {
      // Új húzás létrehozása
      const nextDrawNumber = 1
      lotteryStorage.addDraw({
        drawNumber: nextDrawNumber,
        winningNumber: 0,
        jackpot: 1000000,
        totalTickets: 0,
        status: 'active',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      })
      
      // Statisztikák alaphelyzetbe állítása
      lotteryStorage.updateStats({
        totalTickets: 0,
        activeTickets: 0,
        totalJackpot: 1000000,
        lastDrawNumber: 0,
        nextDrawTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      
      return NextResponse.json({
        success: true,
        message: 'Draw reset successfully! New draw created with 1M $CHESS jackpot.'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('[Admin Draw] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform admin action'
    }, { status: 500 })
  }
}
