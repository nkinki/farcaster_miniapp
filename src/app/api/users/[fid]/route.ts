// FÁJL: /src/app/api/users/[fid]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL is not set');
}
const sql = neon(process.env.NEON_DB_URL);

// JAVÍTÁS: A GET függvény szignatúrája a helyes TypeScript típusokat használja.
// A második argumentum egy objektum, aminek van egy `params` tulajdonsága.
export async function GET(
  request: NextRequest,
  context: { params: { fid: string } } 
) {
  try {
    // A fid-et a `context.params` objektumból olvassuk ki.
    const fidString = context.params.fid;
    const fid = parseInt(fidString, 10);
    
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid Farcaster ID in URL' }, { status: 400 });
    }

    // A lekérdezés innentől változatlan.
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
    // A hibaüzenetben is használhatjuk a context-et a pontosabb naplózáshoz.
    console.error(`API Error in GET /api/users/${context.params.fid}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}