import { NextRequest, NextResponse } from 'next/server'
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
  // ... további mezők, ha vannak
}

// PostgreSQL kapcsolat beállítása (feltételezve, hogy a környezeti változókban van a DB URL)
const pool = new Pool({ connectionString: process.env.NEON_DB_URL })

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Lekérjük a statisztikákat a DB-ből
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

    // Átalakítjuk a választ a frontend elvárásai szerint
    const miniapps = rows.map((row: MiniappStatisticsRow) => ({
      rank: row.current_rank,
      name: row.name, // ha van ilyen mező, különben ki kell egészíteni joinnal
      domain: row.domain, // ha van ilyen mező, különben ki kell egészíteni joinnal
      description: row.description || '', // ha van ilyen mező
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

    return NextResponse.json({
      miniapps,
      total: rows.length,
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