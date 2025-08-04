// FÁJL: /src/app/api/users/[fid]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL is not set');
}
const sql = neon(process.env.NEON_DB_URL);

// A Next.js a dinamikus paramétereket a második argumentumban adja át.
export async function GET(
  request: NextRequest, 
  { params }: { params: { fid: string } }
) {
  try {
    // A fid-et közvetlenül a `params` objektumból olvassuk ki.
    const fidString = params.fid;
    const fid = parseInt(fidString, 10);
    
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid Farcaster ID in URL' }, { status: 400 });
    }

    // Lekérdezzük a felhasználó statisztikáit.
    const statsResult = await sql`
      SELECT
        COUNT(*) AS total_shares,
        COALESCE(SUM(reward_amount), 0) AS total_earnings
      FROM shares
      WHERE sharer_fid = ${fid};
    `;

    // Biztosítjuk, hogy mindig legyen eredmény, még ha 0 is az érték.
    const userStats = statsResult[0] || { total_shares: '0', total_earnings: '0' };

    const responseData = {
      user: {
        fid: fid,
        total_shares: parseInt(userStats.total_shares as string, 10),
        total_earnings: parseFloat(userStats.total_earnings as string)
      }
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error(`API Error in GET /api/users/${params.fid}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Ha szükséged van POST, PUT, DELETE metódusokra ehhez az útvonalhoz, azokat is ide kellene tenned.
// Pl. export async function POST(request: NextRequest, { params }: { params: { fid: string } }) { ... }