import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promoterFid = searchParams.get('promoterFid');

    if (!promoterFid) {
      return NextResponse.json({ 
        error: 'promoterFid parameter is required' 
      }, { status: 400 });
    }

    // Get pending follows for the promoter's campaigns
    const pendingFollows = await sql`
      SELECT 
        pf.*,
        p.cast_url,
        p.share_text,
        p.reward_per_share
      FROM pending_follows pf
      JOIN promotions p ON pf.promotion_id = p.id
      WHERE p.fid = ${parseInt(promoterFid)}
      ORDER BY pf.submitted_at DESC
    `;

    return NextResponse.json({
      success: true,
      pendingFollows: pendingFollows
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Pending Follows API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
