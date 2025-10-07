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
      const likeRecastResult = await client.query(`
        SELECT DISTINCT promotion_id
        FROM shares
        WHERE sharer_fid = $1 AND action_type = 'like_recast'
      `, [fid]);

      // Get completed comment actions for this user from shares table
      const commentResult = await client.query(`
        SELECT DISTINCT promotion_id
        FROM shares
        WHERE sharer_fid = $1 AND action_type = 'comment'
      `, [fid]);

      // Get completed follow actions for this user from follow_actions table
      let followResult = { rows: [] };
      try {
        followResult = await client.query(`
          SELECT DISTINCT promotion_id
          FROM follow_actions
          WHERE user_fid = $1 AND status IN ('verified', 'rewarded')
        `, [fid]);
      } catch (tableError: any) {
        if (tableError.code === '42P01') { // Table doesn't exist
          console.log('⚠️ follow_actions table does not exist yet');
          followResult = { rows: [] };
        } else {
          throw tableError;
        }
      }

      // Get pending follow actions for this user from pending_follows table
      let pendingFollowResult = { rows: [] };
      try {
        console.log(`🔍 Checking pending_follows for user ${fid}...`);
        pendingFollowResult = await client.query(`
          SELECT DISTINCT promotion_id
          FROM pending_follows
          WHERE user_fid = $1 AND status = 'pending'
        `, [fid]);
        console.log(`✅ Found ${pendingFollowResult.rows.length} pending follows for user ${fid}`);
      } catch (tableError: any) {
        if (tableError.code === '42P01') { // Table doesn't exist
          console.log('⚠️ pending_follows table does not exist yet');
          pendingFollowResult = { rows: [] };
        } else {
          console.error('❌ Error querying pending_follows:', tableError);
          throw tableError;
        }
      }

      // Combine all completed actions (including pending ones)
      const allCompletedActions = [
        ...likeRecastResult.rows,
        ...commentResult.rows,
        ...followResult.rows,
        ...pendingFollowResult.rows
      ];

      console.log(`📊 Completed actions summary for user ${fid}:`, {
        likeRecast: likeRecastResult.rows.length,
        comments: commentResult.rows.length,
        followActions: followResult.rows.length,
        pendingFollows: pendingFollowResult.rows.length,
        total: allCompletedActions.length
      });

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