// FÁJL: /src/app/api/users/[fid]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL is not set');
}
const sql = neon(process.env.NEON_DB_URL);

// JAVÍTÁS: A Next.js dokumentációjával megegyező, hivatalos szintaxist használjuk.
// A második argumentumból közvetlenül destrukturáljuk a `params` objektumot.
export async function GET(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  try {
    // A fid-et most már közvetlenül a `params` objektumból érjük el.
    const fidString = params.fid;
    const fid = parseInt(fidString, 10);
    
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid Farcaster ID in URL' }, { status: 400 });
    }

    const statsResult = await sql`
      SELECT
        COUNT(*) AS total_shares,
        COALESCE(SUM(reward_amount), 0) AS total_earnings
      FROM shares
      WHERE sharer_fid = ${fid};
    `;

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