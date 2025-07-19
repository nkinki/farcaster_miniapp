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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const allMiniapps = loadMiniappData()
    const miniapps = allMiniapps.slice(offset, offset + limit)

    // Transform data for the frontend
    const transformedMiniapps = miniapps.map((item: any) => ({
      rank: item.rank,
      name: item.miniApp.name,
      domain: item.miniApp.domain,
      description: item.miniApp.description || item.miniApp.subtitle || '',
      author: {
        username: item.miniApp.author.username,
        displayName: item.miniApp.author.displayName,
        followerCount: item.miniApp.author.followerCount
      },
      category: item.miniApp.primaryCategory || 'other',
      rank72hChange: item.rank72hChange || 0,
      iconUrl: item.miniApp.iconUrl,
      homeUrl: item.miniApp.homeUrl
    }))

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

    const stats = {
      totalMiniapps,
      newToday: Math.floor(Math.random() * 50) + 10, // Simulated
      activeUsers: `${Math.floor(Math.random() * 100) + 20}K`, // Simulated
      avgRating: `${(Math.random() * 2 + 3.5).toFixed(1)}⭐`, // Simulated
      topCategories
    }

    return NextResponse.json({
      miniapps: transformedMiniapps,
      stats,
      total: totalMiniapps,
      limit,
      offset
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 