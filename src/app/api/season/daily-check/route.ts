import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { user_fid, chess_balance, chess_points } = await request.json();

    if (!user_fid || chess_balance === undefined || chess_points === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Check if user already checked today
    const today = new Date().toISOString().split('T')[0];
    const existingCheck = await client.query(`
      SELECT id, daily_check FROM user_daily_points 
      WHERE user_fid = $1 AND date = $2
    `, [user_fid, today]);

    if (existingCheck.rows.length > 0 && existingCheck.rows[0].daily_check) {
      return NextResponse.json({ 
        success: false, 
        error: 'Already checked today' 
      }, { status: 400 });
    }

    await client.query('BEGIN');

    const totalPoints = 1 + chess_points; // Daily check + CHESS points

    if (existingCheck.rows.length > 0) {
      // Update existing record
      await client.query(`
        UPDATE user_daily_points 
        SET 
          daily_check = true,
          chess_holdings_points = $1,
          total_points = total_points + $2,
          updated_at = NOW()
        WHERE user_fid = $3 AND date = $4
      `, [chess_points, totalPoints, user_fid, today]);
    } else {
      // Create new record
      await client.query(`
        INSERT INTO user_daily_points (
          user_fid, season_id, date, daily_check, 
          chess_holdings_points, total_points
        ) VALUES ($1, 1, $2, true, $3, $4)
      `, [user_fid, today, chess_points, totalPoints]);
    }

    // Add transaction record
    await client.query(`
      INSERT INTO point_transactions (
        user_fid, season_id, action_type, points_earned, metadata
      ) VALUES ($1, 1, 'daily_check', $2, $3)
    `, [user_fid, totalPoints, JSON.stringify({ 
      chess_balance, 
      chess_points,
      timestamp: new Date().toISOString()
    })]);

    // Update user season summary
    await client.query(`
      INSERT INTO user_season_summary (
        user_fid, season_id, total_points, daily_checks, 
        total_chess_points, last_activity
      ) VALUES ($1, 1, $2, 1, $3, NOW())
      ON CONFLICT (user_fid, season_id) 
      DO UPDATE SET 
        total_points = user_season_summary.total_points + $2,
        daily_checks = user_season_summary.daily_checks + 1,
        total_chess_points = user_season_summary.total_chess_points + $3,
        last_activity = NOW(),
        updated_at = NOW()
    `, [user_fid, totalPoints, chess_points]);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      points_earned: totalPoints,
      chess_balance: chess_balance,
      message: `Daily check completed! Earned ${totalPoints} points.`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Daily check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Daily check failed' 
    }, { status: 500 });
  } finally {
    client.release();
  }
}
