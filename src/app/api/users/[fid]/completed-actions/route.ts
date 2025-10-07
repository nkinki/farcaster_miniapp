import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false }
});

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

    const client = await pool.connect();
    
    try {
      // Get completed like_recast actions for this user from shares table
      const sharesResult = await client.query(`
        SELECT DISTINCT promotion_id
        FROM shares
        WHERE sharer_fid = $1 AND action_type = 'like_recast'
      `, [fid]);

      // Get completed follow actions for this user from follow_actions table
      const followResult = await client.query(`
        SELECT DISTINCT promotion_id
        FROM follow_actions
        WHERE user_fid = $1 AND status IN ('verified', 'rewarded')
      `, [fid]);

      // Get completed comment actions for this user from comment_actions table
      const commentResult = await client.query(`
        SELECT DISTINCT promotion_id
        FROM comment_actions
        WHERE user_fid = $1 AND status IN ('verified', 'rewarded')
      `, [fid]);

      // Combine all completed actions
      const allCompletedActions = [
        ...sharesResult.rows,
        ...followResult.rows,
        ...commentResult.rows
      ];

      return NextResponse.json({
        completedActions: allCompletedActions,
        count: allCompletedActions.length
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Failed to fetch completed actions:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch completed actions',
      details: error.message 
    }, { status: 500 });
  }
}