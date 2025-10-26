import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fid: string }> }
) {
  try {
    const params = await context.params;
    const fid = parseInt(params.fid);

    if (isNaN(fid)) {
      return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
    }

    // Get the latest claim from claims table (where user_fid = fid)
    const result = await sql`
      SELECT amount, created_at as claimed_at
      FROM claims 
      WHERE user_fid = ${fid} 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({ amount: 0 }, { status: 200 });
    }

    return NextResponse.json({ 
      amount: Number(result[0].amount),
      claimedAt: result[0].claimed_at
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching latest claim:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

