import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'

interface MiniappStatisticsRow {
  current_rank: number;
  name?: string;
  domain?: string;
  description?: string;
  author_username?: string;
  author_display_name?: string;
  author_follower_count?: number;
  primary_category?: string;
  rank_24h_change?: number;
  rank_72h_change?: number;
  rank_7d_change?: number;
  rank_30d_change?: number;
  icon_url?: string;
  home_url?: string;
}

interface MiniappData {
  rank: number;
  miniApp: {
    domain: string;
    name: string;
    iconUrl: string;
    homeUrl: string;
    author: {
      fid: number;
      displayName: string;
      followerCount: number;
      username: string;
      // stb.
    };
    // stb.
  };
  rank24hChange?: number;
  rank72hChange?: number;
  rankWeeklyChange?: number;
  rank30dChange?: number;
}

const pool = new Pool({ connectionString: process.env.NEON_DB_URL })

function loadMiniappData(): MiniappData[] {
  try {
    let dataPath = path.join(process.cwd(), 'public', 'data', 'top_miniapps.json')
    if (!fs.existsSync(dataPath)) {
      dataPath = path.join(process.cwd(), 'top_miniapps.json')
    }
    const data = fs.readFileSync(dataPath, 'utf8')
    const parsed = JSON.parse(data)
    if (parsed && Array.isArray(parsed.miniapps)) {
      return parsed.miniapps
    }
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

    let miniapps: MiniappData[] | any[] = [];
    if (process.env.NODE_ENV === 'development') {
      // Helyi fejlesztés: fájlból olvasunk
      miniapps = loadMiniappData().slice(offset, offset + limit)
    } else {
      // Production: DB-ből olvasunk
      const { rows } = await pool.query(`
        SELECT s.*, 
               m.name, m.domain, m.icon_url, m.home_url, m.primary_category, 
               m.author_username, m.author_display_name, m.author_follower_count
        FROM miniapp_statistics s
        JOIN miniapps m ON s.miniapp_id = m.id
        WHERE s.stat_date = CURRENT_DATE
        ORDER BY s.current_rank ASC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      miniapps = rows.map((row: MiniappStatisticsRow) => ({
        rank: row.current_rank,
        name: row.name,
        domain: row.domain,
        description: row.description || '',
        author: {
          username: row.author_username || '',
          displayName: row.author_display_name || '',
          followerCount: row.author_follower_count || 0
        },
        category: row.primary_category || 'other',
        rank24hChange: row.rank_24h_change ?? 0,
        rank72hChange: row.rank_72h_change ?? 0,
        rankWeeklyChange: row.rank_7d_change ?? 0,
        rank30dChange: row.rank_30d_change ?? 0,
        iconUrl: row.icon_url || '',
        homeUrl: row.home_url || ''
      }))
    }

    return NextResponse.json({
      miniapps,
      total: miniapps.length,
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