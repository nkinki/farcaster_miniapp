import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();

  try {
    // Set a reasonable timeout for this query
    await client.query('SET statement_timeout = 30000'); // 30 seconds
    // Get current active season ID
    const seasonResult = await client.query(`
      SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
    `);

    if (seasonResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        leaderboard: []
      });
    }

    const seasonId = seasonResult.rows[0].id;

    // Get leaderboard data from cached summary table (optimized)
    const leaderboardResult = await client.query(`
      SELECT 
        user_fid,
        total_points,
        daily_checks,
        total_likes as like_recast_count,
        total_shares as shares_count,
        total_comments as comments_count,
        total_lambo_tickets as lambo_tickets,
        total_weather_tickets as weather_tickets,
        total_chess_points as chess_points,
        last_activity
      FROM user_season_summary
      WHERE season_id = $1 AND total_points > 0
      ORDER BY total_points DESC, last_activity DESC
    `, [seasonId]);

    return NextResponse.json({
      success: true,
      leaderboard: leaderboardResult.rows
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({
      success: false,
      error: 'Error fetching leaderboard'
    }, { status: 500 });
  } finally {
    client.release();
  }
}
