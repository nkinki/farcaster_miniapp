import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json({ 
        success: false, 
        error: 'User FID is required' 
      }, { status: 400 });
    }

    // Get current active season ID
    const seasonResult = await client.query(`
      SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
    `);
    
    if (seasonResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        points: {
          total_points: 0,
          daily_checks: 0,
          total_likes: 0,
          total_recasts: 0,
          total_quotes: 0,
          total_shares: 0,
          total_comments: 0,
          total_lambo_tickets: 0,
          total_weather_tickets: 0,
          total_chess_points: 0,
          last_activity: null
        }
      });
    }
    
    const seasonId = seasonResult.rows[0].id;

    // Get data from existing tables
    const [
      dailyChecksResult,
      likeRecastResult,
      sharesResult,
      commentsResult,
      lamboTicketsResult,
      weatherTicketsResult,
      chessPointsResult
    ] = await Promise.all([
      // Daily checks from user_daily_points
      client.query(`
        SELECT COUNT(*) as daily_checks, MAX(created_at) as last_daily_check
        FROM user_daily_points 
        WHERE user_fid = $1 AND season_id = $2 AND daily_check = true
      `, [fid, seasonId]),
      
      // Like/Recast from like_recast_actions
      client.query(`
        SELECT 
          COUNT(CASE WHEN action_type = 'like' THEN 1 END) as total_likes,
          COUNT(CASE WHEN action_type = 'recast' THEN 1 END) as total_recasts,
          MAX(created_at) as last_like_recast
        FROM like_recast_actions 
        WHERE user_fid = $1
      `, [fid]),
      
      // Quotes/Shares from shares table
      client.query(`
        SELECT 
          COUNT(*) as total_shares,
          MAX(created_at) as last_share
        FROM shares 
        WHERE sharer_fid = $1
      `, [fid]),
      
      // Comments from both shares table (approved) and pending_comments table (pending + approved)
      client.query(`
        SELECT 
          COUNT(*) as total_comments,
          MAX(created_at) as last_comment
        FROM (
          SELECT created_at FROM shares WHERE sharer_fid = $1 AND action_type = 'comment'
          UNION ALL
          SELECT created_at FROM pending_comments WHERE user_fid = $1
        ) as all_comments
      `, [fid]),
      
      // Lambo tickets from lottery_tickets
      client.query(`
        SELECT 
          COUNT(*) as total_lambo_tickets,
          MAX(created_at) as last_lambo_ticket
        FROM lottery_tickets 
        WHERE player_fid = $1
      `, [fid]),
      
      // Weather tickets from weather_lotto_tickets
      client.query(`
        SELECT 
          COUNT(*) as total_weather_tickets,
          MAX(created_at) as last_weather_ticket
        FROM weather_lotto_tickets 
        WHERE player_fid = $1
      `, [fid]),
      
      // CHESS points from user_daily_points
      client.query(`
        SELECT 
          COALESCE(SUM(chess_holdings_points), 0) as total_chess_points,
          MAX(created_at) as last_chess_check
        FROM user_daily_points 
        WHERE user_fid = $1 AND season_id = $2
      `, [fid, seasonId])
    ]);

    // Calculate totals
    const dailyChecks = parseInt(dailyChecksResult.rows[0]?.daily_checks || '0');
    const totalLikes = parseInt(likeRecastResult.rows[0]?.total_likes || '0');
    const totalRecasts = parseInt(likeRecastResult.rows[0]?.total_recasts || '0');
    const totalShares = parseInt(sharesResult.rows[0]?.total_shares || '0');
    const totalComments = parseInt(commentsResult.rows[0]?.total_comments || '0');
    const totalLamboTickets = parseInt(lamboTicketsResult.rows[0]?.total_lambo_tickets || '0');
    const totalWeatherTickets = parseInt(weatherTicketsResult.rows[0]?.total_weather_tickets || '0');
    const totalChessPoints = parseInt(chessPointsResult.rows[0]?.total_chess_points || '0');

    // Calculate total points (1 point per action + daily checks + CHESS points)
    const totalPoints = dailyChecks + totalLikes + totalRecasts + totalShares + totalComments + totalLamboTickets + totalWeatherTickets + totalChessPoints;

    // Get last activity from all sources
    const lastActivities = [
      dailyChecksResult.rows[0]?.last_daily_check,
      likeRecastResult.rows[0]?.last_like_recast,
      sharesResult.rows[0]?.last_share,
      commentsResult.rows[0]?.last_comment,
      lamboTicketsResult.rows[0]?.last_lambo_ticket,
      weatherTicketsResult.rows[0]?.last_weather_ticket,
      chessPointsResult.rows[0]?.last_chess_check
    ].filter(Boolean).sort().reverse();

    const lastActivity = lastActivities[0] || null;

    return NextResponse.json({
      success: true,
      points: {
        total_points: totalPoints,
        daily_checks: dailyChecks,
        total_likes: totalLikes,
        total_recasts: totalRecasts,
        total_quotes: totalShares, // Quotes are shares
        total_shares: totalShares,
        total_comments: totalComments,
        total_lambo_tickets: totalLamboTickets,
        total_weather_tickets: totalWeatherTickets,
        total_chess_points: totalChessPoints,
        last_activity: lastActivity
      }
    });

  } catch (error) {
    console.error('Error fetching user points:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user points' 
    }, { status: 500 });
  } finally {
    client.release();
  }
}
