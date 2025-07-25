import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic';

// Típusdefiníció, ami leírja, mit várunk vissza az SQL lekérdezésből.
interface MiniappQueryResult {
  id: string
  name: string
  domain: string
  home_url: string
  icon_url: string
  primary_category: string | null
  author: {
    username: string
    displayName: string
    followerCount: number
  }
  rank: number
  rank_24h_change: number | null
  rank_72h_change: number | null
  rank_7d_change: number | null
  rank_30d_change: number | null
  avg_rank: string | null;
  best_rank: number | null;
}

interface CategoryInfo {
  name: string
  count: number
}

interface CategoryCount {
  category: string | null
  count: string // A COUNT(*) string-ként jön vissza
}

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL környezeti változó nincs beállítva')
}
const sql = neon(process.env.NEON_DB_URL);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const [miniappsResult, totalResult, categoriesResult] = await Promise.all([
      sql`
        SELECT 
            m.id, m.name, m.domain, m.home_url, m.icon_url, m.primary_category,
            json_build_object(
              'username', m.author_username,
              'displayName', m.author_display_name,
              'followerCount', m.author_follower_count
            ) as author,
            s.current_rank as rank,
            s.rank_24h_change,
            s.rank_72h_change,
            s.rank_7d_change,
            s.rank_30d_change,
            s.avg_rank,
            s.best_rank
        FROM miniapps m
        JOIN miniapp_statistics s ON m.id = s.miniapp_id
        WHERE s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics)
        ORDER BY s.current_rank ASC
        LIMIT ${limit} OFFSET ${offset};
      `,
      sql`SELECT COUNT(*) FROM miniapps;`,
      sql`
        SELECT primary_category as category, COUNT(*) as count
        FROM miniapps
        WHERE primary_category IS NOT NULL
        GROUP BY primary_category
        ORDER BY count DESC
        LIMIT 5;
      `
    ]);
    
    // JAVÍTÁS 1: Az `any` helyett a TypeScriptre bízzuk a típus kikövetkeztetését,
    // miután megmondtuk neki, hogy a `miniappsResult` egy `MiniappQueryResult` tömb.
    const transformedMiniapps = (miniappsResult as MiniappQueryResult[]).map((item) => ({
      id: item.id,
      rank: item.rank,
      name: item.name,
      domain: item.domain,
      description: '', 
      author: item.author,
      category: item.primary_category || 'other',
      rank24hChange: item.rank_24h_change ?? 0,
      rank72hChange: item.rank_72h_change ?? 0,
      rankWeeklyChange: item.rank_7d_change ?? 0,
      rank30dChange: item.rank_30d_change ?? 0,
      avgRank: item.avg_rank ? parseFloat(item.avg_rank).toFixed(1) : null,
      bestRank: item.best_rank ?? null,
      iconUrl: item.icon_url,
      homeUrl: item.home_url
    }));

    const totalMiniapps = parseInt(totalResult[0].count as string, 10);
    
    // JAVÍTÁS 2: `any[]` helyett a pontos `CategoryCount[]` típust használjuk
    const topCategories: CategoryInfo[] = (categoriesResult as CategoryCount[]).map(cat => ({
      name: cat.category || 'other',
      count: parseInt(cat.count, 10)
    }));

    const stats = {
      totalMiniapps,
      newToday: 0, 
      activeUsers: 'N/A',
      avgRating: 'N/A',
      topCategories
    };

    return NextResponse.json({
      miniapps: transformedMiniapps,
      stats,
      total: totalMiniapps,
      limit,
      offset
    });

  } catch (error) {
    console.error('API hiba:', error);
    return NextResponse.json(
      { error: 'Belső szerverhiba' },
      { status: 500 }
    );
  }
}