import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

    // Get leaderboard data by calculating points from all tables
    const leaderboardResult = await client.query(`
      WITH user_stats AS (
        SELECT 
          user_fid,
          -- Daily checks
          COALESCE((
            SELECT COUNT(*) FROM user_daily_points 
            WHERE user_fid = udp.user_fid AND season_id = $1 AND daily_check = true
          ), 0) as daily_checks,
          
          -- Like/Recast
          COALESCE((
            SELECT COUNT(*) FROM like_recast_actions 
            WHERE user_fid = udp.user_fid
          ), 0) as like_recast_count,
          
          -- Shares/Quotes
          COALESCE((
            SELECT COUNT(*) FROM shares 
            WHERE sharer_fid = udp.user_fid
          ), 0) as shares_count,
          
          -- Comments
          COALESCE((
            SELECT COUNT(*) FROM (
              SELECT created_at FROM shares WHERE sharer_fid = udp.user_fid AND action_type = 'comment'
              UNION ALL
              SELECT created_at FROM pending_comments WHERE user_fid = udp.user_fid
            ) as all_comments
          ), 0) as comments_count,
          
          -- Lambo tickets
          COALESCE((
            SELECT COUNT(*) FROM lottery_tickets 
            WHERE player_fid = udp.user_fid
          ), 0) as lambo_tickets,
          
          -- Weather tickets
          COALESCE((
            SELECT COUNT(*) FROM weather_lotto_tickets 
            WHERE player_fid = udp.user_fid
          ), 0) as weather_tickets,
          
          -- CHESS points
          COALESCE((
            SELECT SUM(chess_holdings_points) FROM user_daily_points 
            WHERE user_fid = udp.user_fid AND season_id = $1
          ), 0) as chess_points,
          
          -- Last activity
          MAX(udp.created_at) as last_activity
          
        FROM user_daily_points udp
        WHERE udp.season_id = $1
        GROUP BY udp.user_fid
      )
      SELECT 
        user_fid,
        (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points) as total_points,
        daily_checks,
        like_recast_count,
        shares_count,
        comments_count,
        lambo_tickets,
        weather_tickets,
        chess_points,
        last_activity
      FROM user_stats
      WHERE (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points) > 0
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
