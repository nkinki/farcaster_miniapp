import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { untrustedData, trustedData } = body

    // Get the button index that was clicked
    const buttonIndex = untrustedData?.buttonIndex || 1

    // Generate a random number for dice roll
    const randomNumber = Math.floor(Math.random() * 6) + 1

    // Create different responses based on button clicked
    let imageUrl = ''
    let buttons = []
    let postUrl = ''

    switch (buttonIndex) {
      case 1: // Roll Dice
        imageUrl = `https://via.placeholder.com/1200x630/8b5cf6/ffffff?text=Dice+Roll:+${randomNumber}`
        buttons = [
          { label: '🎲 Roll Again', action: 'post' },
          { label: '📊 View Stats', action: 'post' },
          { label: '🎁 Claim Reward', action: 'post' },
          { label: '🔄 Reset', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=dice&result=${randomNumber}`
        break

      case 2: // View Stats
        imageUrl = 'https://via.placeholder.com/1200x630/10b981/ffffff?text=Statistics:+Rolls:+15+Avg:+3.2'
        buttons = [
          { label: '🎲 Roll Dice', action: 'post' },
          { label: '📊 More Stats', action: 'post' },
          { label: '🎁 Claim Reward', action: 'post' },
          { label: '🔄 Refresh', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=stats`
        break

      case 3: // Claim Reward
        imageUrl = 'https://via.placeholder.com/1200x630/f59e0b/ffffff?text=Reward+Claimed!+🎁+10+Tokens'
        buttons = [
          { label: '🎲 Roll Dice', action: 'post' },
          { label: '📊 View Stats', action: 'post' },
          { label: '🎁 Claim Again', action: 'post' },
          { label: '🔄 Reset', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=reward`
        break

      case 4: // Refresh/Reset
        imageUrl = 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Farcaster+Miniapp+Refreshed'
        buttons = [
          { label: '🎲 Roll Dice', action: 'post' },
          { label: '📊 View Stats', action: 'post' },
          { label: '🎁 Claim Reward', action: 'post' },
          { label: '🔄 Refresh', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=reset`
        break

      default:
        imageUrl = 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Farcaster+Miniapp'
        buttons = [
          { label: '🎲 Roll Dice', action: 'post' },
          { label: '📊 View Stats', action: 'post' },
          { label: '🎁 Claim Reward', action: 'post' },
          { label: '🔄 Refresh', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame`
    }

    // Create the Frame response
    const frameResponse = {
      frames: [
        {
          image: imageUrl,
          buttons: buttons,
          postUrl: postUrl,
        },
      ],
    }

    return NextResponse.json(frameResponse)
  } catch (error) {
    console.error('Frame API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests (initial frame load)
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  let imageUrl = 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Farcaster+Miniapp'
  let buttons = [
    { label: '🎲 Roll Dice', action: 'post' },
    { label: '📊 View Stats', action: 'post' },
    { label: '🎁 Claim Reward', action: 'post' },
    { label: '🔄 Refresh', action: 'post' }
  ]

  // Customize based on action parameter
  if (action === 'dice') {
    const result = searchParams.get('result') || '1'
    imageUrl = `https://via.placeholder.com/1200x630/8b5cf6/ffffff?text=Dice+Roll:+${result}`
  } else if (action === 'stats') {
    imageUrl = 'https://via.placeholder.com/1200x630/10b981/ffffff?text=Statistics:+Rolls:+15+Avg:+3.2'
  } else if (action === 'reward') {
    imageUrl = 'https://via.placeholder.com/1200x630/f59e0b/ffffff?text=Reward+Claimed!+🎁+10+Tokens'
  }

  const frameResponse = {
    frames: [
      {
        image: imageUrl,
        buttons: buttons,
        postUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame`,
      },
    ],
  }

  return NextResponse.json(frameResponse)
} 