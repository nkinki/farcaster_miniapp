import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Recalculating user season summary points...');

    // Get current active season
    const seasonResult = await sql`
      SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
    `;
    
    if (seasonResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active season found' 
      }, { status: 400 });
    }
    
    const seasonId = seasonResult[0].id;

    // Recalculate points for all users in this season
    const recalculateResult = await sql`
      WITH user_stats AS (
        SELECT 
          user_fid,
          -- Daily checks
          COALESCE((
            SELECT COUNT(*) FROM user_daily_points 
            WHERE user_fid = udp.user_fid AND season_id = ${seasonId} AND daily_check = true
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
            WHERE user_fid = udp.user_fid AND season_id = ${seasonId}
          ), 0) as chess_points
          
        FROM user_daily_points udp
        WHERE udp.season_id = ${seasonId}
        GROUP BY udp.user_fid
      )
      UPDATE user_season_summary 
      SET 
        total_points = (
          SELECT (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points)
          FROM user_stats 
          WHERE user_stats.user_fid = user_season_summary.user_fid
        ),
        total_chess_points = (
          SELECT chess_points
          FROM user_stats 
          WHERE user_stats.user_fid = user_season_summary.user_fid
        ),
        updated_at = NOW()
      WHERE user_season_summary.season_id = ${seasonId}
    `;

    console.log('✅ Points recalculated successfully');

    return NextResponse.json({
      success: true,
      message: 'Points recalculated successfully',
      seasonId
    });

  } catch (error) {
    console.error('❌ Error recalculating points:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to recalculate points' 
      }, 
      { status: 500 }
    );
  }
}
