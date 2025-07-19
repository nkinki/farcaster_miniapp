import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { untrustedData } = body

    // Get the button index that was clicked
    const buttonIndex = untrustedData?.buttonIndex || 1

    // Sample miniapp data
    const topMiniapps = [
      { rank: 1, name: 'Warpcast', change: '+2', users: '45.2K' },
      { rank: 2, name: 'Degen', change: '-1', users: '32.1K' },
      { rank: 3, name: 'Farcaster', change: '+0', users: '28.7K' },
      { rank: 4, name: 'Frame', change: '+3', users: '25.4K' },
      { rank: 5, name: 'Miniapp', change: '-2', users: '22.9K' },
    ]

    // Create different responses based on button clicked
    let imageUrl = ''
    let buttons: Array<{ label: string; action: string }> = []
    let postUrl = ''

    switch (buttonIndex) {
      case 1: // Top 10 Miniapps
        imageUrl = 'https://via.placeholder.com/1200x630/8b5cf6/ffffff?text=Top+10+Miniapps:+Warpcast+%231+Degen+%232+Frame+%234'
        buttons = [
          { label: '📈 Daily Stats', action: 'post' },
          { label: '🏆 Rankings', action: 'post' },
          { label: '📊 Categories', action: 'post' },
          { label: '🔄 Refresh', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=top10`
        break

      case 2: // Daily Stats
        imageUrl = 'https://via.placeholder.com/1200x630/10b981/ffffff?text=Daily+Stats:+1,247+Total+%7C+23+New+Today+%7C+45.2K+Users'
        buttons = [
          { label: '📊 Top 10 Miniapps', action: 'post' },
          { label: '🏆 Rankings', action: 'post' },
          { label: '📊 Categories', action: 'post' },
          { label: '🔄 Refresh', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=stats`
        break

      case 3: // Rankings
        imageUrl = 'https://via.placeholder.com/1200x630/f59e0b/ffffff?text=Rankings:+Games+342+%7C+Social+298+%7C+Finance+156+%7C+Tools+234'
        buttons = [
          { label: '📊 Top 10 Miniapps', action: 'post' },
          { label: '📈 Daily Stats', action: 'post' },
          { label: '📊 Categories', action: 'post' },
          { label: '🔄 Refresh', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=rankings`
        break

      case 4: // Refresh
        imageUrl = 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Daily+Miniapp+Tracker+Refreshed'
        buttons = [
          { label: '📊 Top 10 Miniapps', action: 'post' },
          { label: '📈 Daily Stats', action: 'post' },
          { label: '🏆 Rankings', action: 'post' },
          { label: '🔄 Refresh', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=refresh`
        break

      default:
        imageUrl = 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Daily+Miniapp+Tracker'
        buttons = [
          { label: '📊 Top 10 Miniapps', action: 'post' },
          { label: '📈 Daily Stats', action: 'post' },
          { label: '🏆 Rankings', action: 'post' },
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

  let imageUrl = 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Daily+Miniapp+Tracker'
  const buttons = [
    { label: '📊 Top 10 Miniapps', action: 'post' },
    { label: '📈 Daily Stats', action: 'post' },
    { label: '🏆 Rankings', action: 'post' },
    { label: '🔄 Refresh', action: 'post' }
  ]

  // Customize based on action parameter
  if (action === 'top10') {
    imageUrl = 'https://via.placeholder.com/1200x630/8b5cf6/ffffff?text=Top+10+Miniapps:+Warpcast+%231+Degen+%232+Frame+%234'
  } else if (action === 'stats') {
    imageUrl = 'https://via.placeholder.com/1200x630/10b981/ffffff?text=Daily+Stats:+1,247+Total+%7C+23+New+Today+%7C+45.2K+Users'
  } else if (action === 'rankings') {
    imageUrl = 'https://via.placeholder.com/1200x630/f59e0b/ffffff?text=Rankings:+Games+342+%7C+Social+298+%7C+Finance+156+%7C+Tools+234'
  } else if (action === 'refresh') {
    imageUrl = 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Daily+Miniapp+Tracker+Refreshed'
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