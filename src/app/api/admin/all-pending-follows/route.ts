import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    // Get all pending follows for admin review
    let pendingFollows = [];
    try {
      pendingFollows = await sql`
        SELECT 
          pf.*,
          p.cast_url,
          p.share_text,
          p.reward_per_share
        FROM pending_follows pf
        JOIN promotions p ON pf.promotion_id = p.id
        ORDER BY pf.submitted_at DESC
      `;
    } catch (tableError: any) {
      if (tableError.code === '42P01') { // Table doesn't exist
        console.log('⚠️ pending_follows table does not exist yet');
        pendingFollows = [];
      } else {
        throw tableError;
      }
    }

    return NextResponse.json({
      success: true,
      pendingFollows: pendingFollows
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ All Pending Follows API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
