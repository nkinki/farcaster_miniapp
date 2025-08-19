import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
  try {
    const promos = await sql`
      SELECT 
        p.id,
        p.cast_url,
        p.reward_per_share,
        p.remaining_budget,
        p.total_budget,
        p.shares_count,
        p.action_type,
        p.status,
        u.username as author_username
      FROM promotions p
      LEFT JOIN users u ON p.fid = u.fid
      WHERE p.status = 'active'
      AND p.remaining_budget >= p.reward_per_share
      ORDER BY p.reward_per_share DESC, p.id DESC
    `;

    return NextResponse.json({
      promos: promos
    });

  } catch (error: any) {
    console.error('Admin shareable promos error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch shareable promos', 
      details: error.message 
    }, { status: 500 });
  }
}