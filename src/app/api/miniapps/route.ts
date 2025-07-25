import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// Típusdefiníciók
interface MiniappDbRow {
  rank: number
  rank72hChange: number | null
  rank24hChange: number | null
  rankWeeklyChange: number | null
  rank30dChange: number | null
  miniApp: { // Feltételezve, hogy ez egy JSONB oszlop az adatbázisban
    id: string
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
  category: string
  count: string // A COUNT(*) string-ként jön vissza, konvertálni kell
}

// Neon DB kapcsolat inicializálása a környezeti változóból
// A process.env.NEON_DB_URL a .env.local fájlból jön
if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL környezeti változó nincs beállítva')
}
const sql = neon(process.env.NEON_DB_URL)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formátum

    // Párhuzamosan futtatjuk a lekérdezéseket a jobb teljesítményért
    const [miniappsResult, totalResult, categoriesResult] = await Promise.all([
      // 1. Fő lekérdezés a miniappok listájához, a legfrissebb statisztikákkal összekapcsolva
      sql`
        SELECT 
            m.id,
            m.name,
            m.domain,
            m.home_url,
            m.icon_url,
            m.primary_category,
            json_build_object(
              'username', m.author_username,
              'displayName', m.author_display_name,
              'followerCount', m.author_follower_count
            ) as author,
            s.current_rank as rank,
            s.rank_24h_change,
            s.rank_72h_change,
            s.rank_7d_change,
            s.rank_30d_change
        FROM 
            miniapps m
        JOIN 
            miniapp_statistics s ON m.id = s.miniapp_id
        WHERE 
            s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics)
        ORDER BY 
            s.current_rank ASC
        LIMIT ${limit}
        OFFSET ${offset};
      `,
      // 2. Lekérdezés a teljes darabszámhoz
      sql`SELECT COUNT(*) FROM miniapps;`,

      // 3. Lekérdezés a top kategóriákhoz
      sql`
        SELECT 
            primary_category as category, 
            COUNT(*) as count
        FROM 
            miniapps
        WHERE
            primary_category IS NOT NULL
        GROUP BY 
            primary_category
        ORDER BY 
            count DESC
        LIMIT 4;
      `
    ])
    
    // Adatok átalakítása a frontend számára megfelelő formátumra
    const transformedMiniapps = miniappsResult.map((item: any) => ({
      rank: item.rank,
      name: item.name,
      domain: item.domain,
      description: item.description || '', // Ezt az oszlopot a miniapps táblához kell adni, ha szükséges
      author: item.author,
      category: item.primary_category || 'other',
      rank24hChange: item.rank_24h_change ?? 0,
      rank72hChange: item.rank_72h_change ?? 0,
      rankWeeklyChange: item.rank_7d_change ?? 0,
      rank30dChange: item.rank_30d_change ?? 0,
      iconUrl: item.icon_url,
      homeUrl: item.home_url
    }));

    const totalMiniapps = parseInt(totalResult[0].count as string, 10)
    const topCategories = (categoriesResult as CategoryCount[]).map(cat => ({
      name: cat.category,
      count: parseInt(cat.count, 10)
    }))

    const stats = {
      totalMiniapps,
      newToday: 0, // Ezt az adatot az adatbázisból kellene számolni, ha van rá mód
      activeUsers: 'N/A', // Szintén adatbázisból
      avgRating: 'N/A', // Szintén adatbázisból
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