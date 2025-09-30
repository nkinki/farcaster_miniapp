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
    console.log(`🔍 Debugging user ${userFid} season data...`);
    
    // Get current active season ID
    const seasonResult = await client.query(`
      SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
    `);
    
    if (seasonResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active season found' 
      });
    }
    
    const seasonId = seasonResult.rows[0].id;
    console.log(`📊 Active season ID: ${seasonId}`);

    // Get user season summary
    const summaryResult = await client.query(`
      SELECT * FROM user_season_summary 
      WHERE user_fid = $1 AND season_id = $2
    `, [userFid, seasonId]);

    console.log(`📊 User season summary:`, summaryResult.rows[0] || 'No data found');

    // Get point transactions
    const transactionsResult = await client.query(`
      SELECT action_type, points_earned, created_at, metadata
      FROM point_transactions 
      WHERE user_fid = $1 AND season_id = $2
      ORDER BY created_at DESC
      LIMIT 10
    `, [userFid, seasonId]);

    console.log(`📊 Recent transactions:`, transactionsResult.rows);

    // Get daily points
    const dailyPointsResult = await client.query(`
      SELECT date, daily_check, total_points, created_at
      FROM user_daily_points 
      WHERE user_fid = $1 AND season_id = $2
      ORDER BY date DESC
      LIMIT 5
    `, [userFid, seasonId]);

    console.log(`📊 Daily points:`, dailyPointsResult.rows);

    return NextResponse.json({
      success: true,
      season_id: seasonId,
      user_season_summary: summaryResult.rows[0] || null,
      recent_transactions: transactionsResult.rows,
      daily_points: dailyPointsResult.rows
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Debug error: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
