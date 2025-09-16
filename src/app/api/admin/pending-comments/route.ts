import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promoterFid = parseInt(searchParams.get('promoterFid') || '', 10);
    const status = searchParams.get('status') || 'pending';

    if (isNaN(promoterFid)) {
      return NextResponse.json({ error: 'Invalid or missing promoterFid' }, { status: 400 });
    }

    // Get pending comments for the promoter's promotions
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
        pc.reviewed_at,
        pc.reviewed_by,
        pc.review_notes,
        p.cast_url,
        p.share_text,
        p.display_name as promoter_display_name,
        p.username as promoter_username
      FROM pending_comments pc
      JOIN promotions p ON pc.promotion_id = p.id
      WHERE p.fid = ${promoterFid}
      AND pc.status = ${status}
      ORDER BY pc.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      pendingComments: pendingComments,
      total: pendingComments.length,
      status: status
    });

  } catch (error: any) {
    console.error('API Error in GET /api/admin/pending-comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
