// FÁJL: /src/app/api/users/[fid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { fid: string } }) {
  try {
    const fid = parseInt(params.fid, 10);
    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid Farcaster ID' }, { status: 400 });
    }

    const [stats] = await sql`
      SELECT
        COALESCE(SUM(reward_amount), 0) AS total_earnings,
        COUNT(*) AS total_shares
      FROM shares
      WHERE sharer_fid = ${fid};
    `;

    return NextResponse.json({ 
      user: {
        fid: fid,
        total_earnings: Number(stats.total_earnings),
        total_shares: Number(stats.total_shares)
      } 
    }, { status: 200 });
  } catch (error: any) {
    console.error(`API Error in GET /api/users/${params.fid}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}