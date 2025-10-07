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

      // Get pending follow actions for this user from pending_follows table
      let pendingFollowResult = { rows: [] };
      try {
        pendingFollowResult = await client.query(`
          SELECT DISTINCT promotion_id
          FROM pending_follows
          WHERE user_fid = $1 AND status = 'pending'
        `, [fid]);
      } catch (tableError: any) {
        if (tableError.code === '42P01') { // Table doesn't exist
          console.log('⚠️ pending_follows table does not exist yet');
          pendingFollowResult = { rows: [] };
        } else {
          throw tableError;
        }
      }

      // Get completed comment actions for this user from comment_actions table
      const commentResult = await client.query(`
        SELECT DISTINCT promotion_id
        FROM comment_actions
        WHERE user_fid = $1 AND status IN ('verified', 'rewarded')
      `, [fid]);

      // Get pending comment actions for this user from pending_comments table
      let pendingCommentResult = { rows: [] };
      try {
        pendingCommentResult = await client.query(`
          SELECT DISTINCT promotion_id
          FROM pending_comments
          WHERE user_fid = $1 AND status = 'pending'
        `, [fid]);
      } catch (tableError: any) {
        if (tableError.code === '42P01') { // Table doesn't exist
          console.log('⚠️ pending_comments table does not exist yet');
          pendingCommentResult = { rows: [] };
        } else {
          throw tableError;
        }
      }

      // Combine all completed actions (including pending ones)
      const allCompletedActions = [
        ...sharesResult.rows,
        ...followResult.rows,
        ...commentResult.rows,
        ...pendingFollowResult.rows,
        ...pendingCommentResult.rows
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