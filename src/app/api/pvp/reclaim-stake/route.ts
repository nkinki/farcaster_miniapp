import { NextRequest, NextResponse } from 'next/server'

interface Voucher {
  gameId: number
  amount: number
  nonce: number
  signature: string
}

export async function POST(request: NextRequest) {
  try {
    const { gameId, playerFid, playerAddress } = await request.json()

    if (!gameId || !playerFid || !playerAddress) {
      return NextResponse.json({
        success: false,
        error: "Game ID, player FID, and player address are required"
      }, { status: 400 })
    }

    // Mock approval logic - production-ben database validation
    const reclaimApproved = true // Mock: always approved for now
    
    if (reclaimApproved) {
      // Generate mock voucher data
      const voucher: Voucher = {
        gameId: gameId,
        amount: 10000, // 10,000 $CHESS stake
        nonce: Date.now(),
        signature: `0x${Math.random().toString(16).substr(2, 64)}` // Mock signature
      }

      return NextResponse.json({
        success: true,
        reclaimApproved: true,
        voucher: voucher,
        message: "Stake reclamation approved"
      })
    } else {
      return NextResponse.json({
        success: false,
        reclaimApproved: false,
        error: "Stake reclamation not approved"
      }, { status: 400 })
    }
  } catch (error) {
    console.error('[Reclaim Stake] Error:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to process stake reclamation"
    }, { status: 500 })
  }
}
