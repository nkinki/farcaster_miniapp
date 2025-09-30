import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');
  const userFid = fid ? parseInt(fid) : 439015;

  const client = await pool.connect();
  
  try {
    console.log(`🔍 Debugging comments for user ${userFid}...`);
    
    // Check all shares for this user
    const allSharesResult = await client.query(`
      SELECT action_type, COUNT(*) as count, MAX(created_at) as last_activity
      FROM shares 
      WHERE sharer_fid = $1
      GROUP BY action_type
      ORDER BY count DESC
    `, [userFid]);

    console.log(`📊 All shares by action_type:`, allSharesResult.rows);

    // Check specifically for comments
    const commentsResult = await client.query(`
      SELECT * FROM shares 
      WHERE sharer_fid = $1 AND action_type = 'comment'
      ORDER BY created_at DESC
      LIMIT 5
    `, [userFid]);

    console.log(`📊 Comment shares:`, commentsResult.rows);

    // Check if there are any shares at all
    const totalSharesResult = await client.query(`
      SELECT COUNT(*) as total_shares FROM shares WHERE sharer_fid = $1
    `, [userFid]);

    console.log(`📊 Total shares:`, totalSharesResult.rows[0]);

    return NextResponse.json({
      success: true,
      user_fid: userFid,
      all_shares_by_type: allSharesResult.rows,
      comment_shares: commentsResult.rows,
      total_shares: totalSharesResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Debug comments error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Debug comments error: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
