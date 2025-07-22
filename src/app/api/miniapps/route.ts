import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Define types for miniapp data
interface MiniappData {
  rank: number
  rank72hChange?: number
  miniApp: {
    name: string
    domain: string
    description?: string
    subtitle?: string
    primaryCategory?: string
    iconUrl: string
    homeUrl: string
    author: {
      username: string
      displayName: string
      followerCount: number
    }
  }
}

interface CategoryCount {
  [key: string]: number
}

interface CategoryInfo {
  name: string
  count: number
}

// Reward API típusok

// Load real miniapp data
function loadMiniappData(): MiniappData[] {
  try {
    let dataPath = path.join(process.cwd(), 'public', 'data', 'top_miniapps.json')
    if (!fs.existsSync(dataPath)) {
      dataPath = path.join(process.cwd(), 'top_miniapps.json')
    }
    const data = fs.readFileSync(dataPath, 'utf8')
    const parsed = JSON.parse(data)
    // Ha objektum, akkor a miniapps tömböt adjuk vissza
    if (parsed && Array.isArray(parsed.miniapps)) {
      return parsed.miniapps
    }
    // Ha tömb, akkor azt
    if (Array.isArray(parsed)) {
      return parsed
    }
    return []
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
    const transformedMiniapps = miniapps.map((item: MiniappData & { rank30dChange?: number }) => {
      // Szimuláljuk a 24h és heti változásokat (amíg az adatbázisból nem jönnek)
      const rank72hChange = item.rank72hChange || 0
      const rank24hChange = Math.floor(rank72hChange * 0.3 + (Math.random() - 0.5) * 10)
      const rankWeeklyChange = Math.floor(rank72hChange * 1.5 + (Math.random() - 0.5) * 20)
      const rank30dChange = item.rank30dChange ?? 0
      return {
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
        rank72hChange: rank72hChange,
        rank24hChange: rank24hChange,
        rankWeeklyChange: rankWeeklyChange,
        rank30dChange: rank30dChange,
        iconUrl: item.miniApp.iconUrl,
        homeUrl: item.miniApp.homeUrl
      }
    })

    // Calculate statistics
    const totalMiniapps = allMiniapps.length
    const categories = allMiniapps.reduce((acc: CategoryCount, item: MiniappData) => {
      const category = item.miniApp.primaryCategory || 'other'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    const topCategories = Object.entries(categories)
      .sort(([,a]: [string, number], [,b]: [string, number]) => b - a)
      .slice(0, 4)
      .map(([name, count]): CategoryInfo => ({ name, count }))

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