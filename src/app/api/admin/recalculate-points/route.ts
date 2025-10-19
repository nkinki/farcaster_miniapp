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

    // First, get all users who have any activity
    const allUsersResult = await sql`
      SELECT DISTINCT user_fid FROM (
        SELECT user_fid FROM user_daily_points WHERE season_id = ${seasonId}
        UNION
        SELECT user_fid FROM like_recast_actions
        UNION
        SELECT sharer_fid as user_fid FROM shares
        UNION
        SELECT user_fid FROM pending_comments
        UNION
        SELECT player_fid as user_fid FROM lottery_tickets
        UNION
        SELECT player_fid as user_fid FROM weather_lotto_tickets
      ) as all_users
    `;

    console.log(`Found ${allUsersResult.length} users with activity`);

    // Recalculate points for each user
    for (const user of allUsersResult) {
      const userFid = user.user_fid;
      
      // Calculate points for this user
      const userStatsResult = await sql`
        WITH user_stats AS (
          SELECT 
            ${userFid} as user_fid,
            -- Daily checks
            COALESCE((
              SELECT COUNT(*) FROM user_daily_points 
              WHERE user_fid = ${userFid} AND season_id = ${seasonId} AND daily_check = true
            ), 0) as daily_checks,
            
            -- Like/Recast
            COALESCE((
              SELECT COUNT(*) FROM like_recast_actions 
              WHERE user_fid = ${userFid}
            ), 0) as like_recast_count,
            
            -- Shares/Quotes
            COALESCE((
              SELECT COUNT(*) FROM shares 
              WHERE sharer_fid = ${userFid}
            ), 0) as shares_count,
            
            -- Comments
            COALESCE((
              SELECT COUNT(*) FROM (
                SELECT created_at FROM shares WHERE sharer_fid = ${userFid} AND action_type = 'comment'
                UNION ALL
                SELECT created_at FROM pending_comments WHERE user_fid = ${userFid}
              ) as all_comments
            ), 0) as comments_count,
            
            -- Lambo tickets
            COALESCE((
              SELECT COUNT(*) FROM lottery_tickets 
              WHERE player_fid = ${userFid}
            ), 0) as lambo_tickets,
            
            -- Weather tickets
            COALESCE((
              SELECT COUNT(*) FROM weather_lotto_tickets 
              WHERE player_fid = ${userFid}
            ), 0) as weather_tickets,
            
            -- CHESS points
            COALESCE((
              SELECT SUM(chess_holdings_points) FROM user_daily_points 
              WHERE user_fid = ${userFid} AND season_id = ${seasonId}
            ), 0) as chess_points
        )
        SELECT 
          user_fid,
          daily_checks,
          like_recast_count,
          shares_count,
          comments_count,
          lambo_tickets,
          weather_tickets,
          chess_points,
          (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points) as total_points
        FROM user_stats
      `;

      if (userStatsResult.length > 0) {
        const stats = userStatsResult[0];
        
        // Insert or update user season summary
        await sql`
          INSERT INTO user_season_summary (
            user_fid, season_id, total_points, daily_checks,
            total_likes, total_recasts, total_shares, total_comments,
            total_lambo_tickets, total_weather_tickets, total_chess_points,
            last_activity
          ) VALUES (
            ${stats.user_fid}, ${seasonId}, ${stats.total_points}, ${stats.daily_checks},
            ${stats.like_recast_count}, 0, ${stats.shares_count}, ${stats.comments_count},
            ${stats.lambo_tickets}, ${stats.weather_tickets}, ${stats.chess_points},
            NOW()
          )
          ON CONFLICT (user_fid, season_id) 
          DO UPDATE SET 
            total_points = ${stats.total_points},
            daily_checks = ${stats.daily_checks},
            total_likes = ${stats.like_recast_count},
            total_shares = ${stats.shares_count},
            total_comments = ${stats.comments_count},
            total_lambo_tickets = ${stats.lambo_tickets},
            total_weather_tickets = ${stats.weather_tickets},
            total_chess_points = ${stats.chess_points},
            last_activity = NOW(),
            updated_at = NOW()
        `;
      }
    }

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
