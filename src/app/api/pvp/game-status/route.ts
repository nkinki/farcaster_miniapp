import { NextRequest, NextResponse } from 'next/server'

interface GameState {
  gameId: string
  status: 'waiting' | 'active' | 'completed' | 'cancelled'
  player1?: {
    fid: number
    displayName: string
    isReady: boolean
  }
  player2?: {
    fid: number
    displayName: string
    isReady: boolean
  }
  currentTurn?: number
  lastMove?: string
  gameData?: Record<string, unknown>
}

// In-memory storage for game states (production-ben database)
const gameStates = new Map<string, GameState>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gameId = searchParams.get('gameId')

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: 'Game ID is required' },
        { status: 400 }
      )
    }

    // Get game state from memory
    const gameState = gameStates.get(gameId)

    if (!gameState) {
      // If game doesn't exist, create a default waiting state
      const defaultState: GameState = {
        gameId,
        status: 'waiting',
        player1: {
          fid: 0,
          displayName: 'Unknown',
          isReady: false
        }
      }
      
      gameStates.set(gameId, defaultState)
      
      return NextResponse.json({
        success: true,
        gameState: defaultState,
        message: 'Game created, waiting for players'
      })
    }

    return NextResponse.json({
      success: true,
      gameState,
      message: 'Game state retrieved successfully'
    })

  } catch (error) {
    console.error('[Game State] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, action, playerFid, data } = body

    if (!gameId || !action) {
      return NextResponse.json(
        { success: false, error: 'Game ID and action are required' },
        { status: 400 }
      )
    }

    let gameState = gameStates.get(gameId)

    if (!gameState) {
      // Create new game if it doesn't exist
      gameState = {
        gameId,
        status: 'waiting',
        player1: {
          fid: playerFid || 0,
          displayName: 'Player 1',
          isReady: false
        }
      }
      gameStates.set(gameId, gameState)
    }

    // Handle different actions
    switch (action) {
      case 'join':
        if (!gameState.player2 && playerFid !== gameState.player1?.fid) {
          gameState.player2 = {
            fid: playerFid,
            displayName: 'Player 2',
            isReady: false
          }
          gameState.status = 'waiting'
        }
        break

      case 'ready':
        if (gameState.player1 && gameState.player1.fid === playerFid) {
          gameState.player1.isReady = true
        } else if (gameState.player2 && gameState.player2.fid === playerFid) {
          gameState.player2.isReady = true
        }
        
        // Check if both players are ready
        if (gameState.player1?.isReady && gameState.player2?.isReady) {
          gameState.status = 'active'
          gameState.currentTurn = 1 // Player 1 starts
        }
        break

      case 'move':
        if (gameState.status === 'active' && data?.move) {
          gameState.lastMove = data.move
          gameState.currentTurn = gameState.currentTurn === 1 ? 2 : 1
        }
        break

      case 'complete':
        gameState.status = 'completed'
        break

      case 'cancel':
        gameState.status = 'cancelled'
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update the game state
    gameStates.set(gameId, gameState)

    return NextResponse.json({
      success: true,
      gameState,
      message: `Action '${action}' completed successfully`
    })

  } catch (error) {
    console.error('[Game State] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
