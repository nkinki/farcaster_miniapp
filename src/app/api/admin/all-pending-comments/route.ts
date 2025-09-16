import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    // Fetch ALL pending comments (not just for specific promoter)
    const pendingComments = await sql`
      SELECT 
        pc.id,
        pc.promotion_id,
        pc.user_fid,
        pc.username,
        pc.comment_text,
        pc.cast_hash,
        pc.reward_amount,
        pc.status,
        pc.created_at,
        p.cast_url as promotion_cast_url,
        p.share_text as promotion_share_text,
        p.username as promoter_username,
        p.display_name as promoter_display_name,
        p.fid as promoter_fid
      FROM pending_comments pc
      JOIN promotions p ON pc.promotion_id = p.id
      WHERE pc.status = 'pending'
      ORDER BY pc.created_at DESC
    `;

    return NextResponse.json({ success: true, pendingComments }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in GET /api/admin/all-pending-comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
