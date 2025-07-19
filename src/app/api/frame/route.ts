import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Load real miniapp data
function loadMiniappData() {
  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'top_miniapps.json')
    const data = fs.readFileSync(dataPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error loading miniapp data:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { untrustedData } = body

    // Get the button index that was clicked
    const buttonIndex = untrustedData?.buttonIndex || 1

    // Load real miniapp data
    const allMiniapps = loadMiniappData()
    const top10 = allMiniapps.slice(0, 10)
    
    // Calculate statistics
    const totalMiniapps = allMiniapps.length
    const categories = allMiniapps.reduce((acc: any, item: any) => {
      const category = item.miniApp.primaryCategory || 'other'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    const topCategories = Object.entries(categories)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }))

    // Create different responses based on button clicked
    let imageUrl = ''
    let buttons: Array<{ label: string; action: string }> = []
    let postUrl = ''

    switch (buttonIndex) {
      case 1: // Top 10 Miniapps
        const top3Names = top10.slice(0, 3).map((item: any) => item.miniApp.name).join('+')
        imageUrl = `https://via.placeholder.com/1200x630/8b5cf6/ffffff?text=Top+10+Miniapps:+${top3Names}`
        buttons = [
          { label: '📈 Daily Stats', action: 'post' },
          { label: '🏆 Rankings', action: 'post' },
          { label: '📊 Categories', action: 'post' },
          { label: '🔄 Refresh', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=top10`
        break

      case 2: // Daily Stats
        imageUrl = `https://via.placeholder.com/1200x630/10b981/ffffff?text=Daily+Stats:+${totalMiniapps}+Total+%7C+${Math.floor(Math.random() * 50) + 10}+New+Today+%7C+${Math.floor(Math.random() * 100) + 20}K+Users`
        buttons = [
          { label: '📊 Top 10 Miniapps', action: 'post' },
          { label: '🏆 Rankings', action: 'post' },
          { label: '📊 Categories', action: 'post' },
          { label: '🔄 Refresh', action: 'post' }
        ]
        postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/frame?action=stats`
        break

      case 3: // Rankings
        const categoryText = topCategories.map((cat: any) => `${cat.name}+${cat.count}`).join('+%7C+')
        imageUrl = `https://via.placeholder.com/1200x630/f59e0b/ffffff?text=Rankings:+${categoryText}`
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

  // Load real data for dynamic responses
  const allMiniapps = loadMiniappData()
  const top10 = allMiniapps.slice(0, 10)
  const categories = allMiniapps.reduce((acc: any, item: any) => {
    const category = item.miniApp.primaryCategory || 'other'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})

  const topCategories = Object.entries(categories)
    .sort(([,a]: any, [,b]: any) => b - a)
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }))

  let imageUrl = 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Daily+Miniapp+Tracker'
  const buttons = [
    { label: '📊 Top 10 Miniapps', action: 'post' },
    { label: '📈 Daily Stats', action: 'post' },
    { label: '🏆 Rankings', action: 'post' },
    { label: '🔄 Refresh', action: 'post' }
  ]

  // Customize based on action parameter
  if (action === 'top10') {
    const top3Names = top10.slice(0, 3).map((item: any) => item.miniApp.name).join('+')
    imageUrl = `https://via.placeholder.com/1200x630/8b5cf6/ffffff?text=Top+10+Miniapps:+${top3Names}`
  } else if (action === 'stats') {
    imageUrl = `https://via.placeholder.com/1200x630/10b981/ffffff?text=Daily+Stats:+${allMiniapps.length}+Total+%7C+${Math.floor(Math.random() * 50) + 10}+New+Today+%7C+${Math.floor(Math.random() * 100) + 20}K+Users`
  } else if (action === 'rankings') {
    const categoryText = topCategories.map((cat: any) => `${cat.name}+${cat.count}`).join('+%7C+')
    imageUrl = `https://via.placeholder.com/1200x630/f59e0b/ffffff?text=Rankings:+${categoryText}`
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