import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL is not set');
}
const sql = neon(process.env.NEON_DB_URL);

// JAVÍTÁS: Létrehozunk egy dedikált, elnevezett típust a kontextus objektum számára.
// Ez a legrobusztusabb módja a típusdefiníciónak, ami megoldja a build hibát.
type RouteContext = {
  params: {
    fid: string;
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // A `fid`-et a `context.params`-ból olvassuk ki.
    const fid = parseInt(context.params.fid, 10);
    
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid Farcaster ID' }, { status: 400 });
    }

    // Lekérdezzük az összesített statisztikákat a 'shares' táblából
    const statsResult = await sql`
      SELECT
        COUNT(*) AS total_shares,
        COALESCE(SUM(reward_amount), 0) AS total_earnings
      FROM shares
      WHERE sharer_fid = ${fid};
    `;

    const userStats = statsResult[0];

    const responseData = {
      user: {
        fid: fid,
        total_shares: parseInt(userStats.total_shares as string, 10),
        total_earnings: parseFloat(userStats.total_earnings as string)
      }
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('API Error in GET /api/users/[fid]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}