import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL is not set');
}
const sql = neon(process.env.NEON_DB_URL);

// JAVÍTÁS: A második argumentumot teljesen figyelmen kívül hagyjuk,
// és a FID-et közvetlenül az URL-ből olvassuk ki a hiba elkerülése érdekében.
export async function GET(request: NextRequest) {
  try {
    // A teljes URL kiolvasása a request objektumból
    const url = new URL(request.url);
    // Az URL útvonalát szétvágjuk a '/' karakterek mentén
    const pathSegments = url.pathname.split('/');
    // A dinamikus rész (a [fid]) mindig az útvonal utolsó eleme lesz
    const fidString = pathSegments[pathSegments.length - 1];

    const fid = parseInt(fidString, 10);
    
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid Farcaster ID in URL' }, { status: 400 });
    }

    // A lekérdezés innentől változatlan
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