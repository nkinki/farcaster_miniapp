import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { seasonId, totalRewardAmount } = await request.json();

    if (!seasonId || !totalRewardAmount) {
      return NextResponse.json({ 
        success: false, 
        error: 'Season ID and total reward amount are required' 
      }, { status: 400 });
    }

    console.log(`🎯 Calculating airdrop distribution for Season ${seasonId} with ${totalRewardAmount} CHESS`);

    // Get all users with points for this season
    const usersResult = await client.query(`
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
          ), 0) as chess_points
          
        FROM user_daily_points udp
        WHERE udp.season_id = $1
        GROUP BY udp.user_fid
      )
      SELECT 
        user_fid,
        (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points) as total_points
      FROM user_stats
      WHERE (daily_checks + like_recast_count + shares_count + comments_count + lambo_tickets + weather_tickets + chess_points) > 0
      ORDER BY total_points DESC
    `, [seasonId]);

    const users = usersResult.rows;
    
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with points found for this season',
        distribution: []
      });
    }

    // Calculate total points across all users
    const totalPoints = users.reduce((sum, user) => sum + parseInt(user.total_points), 0);
    
    console.log(`📊 Found ${users.length} users with ${totalPoints} total points`);

    // Calculate proportional rewards
    const distribution = users.map((user, index) => {
      const userPoints = parseInt(user.total_points);
      const percentage = (userPoints / totalPoints) * 100;
      const rewardAmount = Math.floor((userPoints / totalPoints) * totalRewardAmount);
      
      return {
        rank: index + 1,
        user_fid: user.user_fid,
        points: userPoints,
        percentage: parseFloat(percentage.toFixed(4)),
        reward_amount: rewardAmount,
        reward_amount_formatted: (rewardAmount / 1000000000000000000).toFixed(2) + ' CHESS'
      };
    });

    // Calculate remaining amount (due to rounding)
    const distributedAmount = distribution.reduce((sum, user) => sum + user.reward_amount, 0);
    const remainingAmount = totalRewardAmount - distributedAmount;
    
    console.log(`💰 Distribution calculated: ${distributedAmount} CHESS distributed, ${remainingAmount} CHESS remaining`);

    return NextResponse.json({
      success: true,
      season_id: seasonId,
      total_reward_amount: totalRewardAmount,
      total_users: users.length,
      total_points: totalPoints,
      distributed_amount: distributedAmount,
      remaining_amount: remainingAmount,
      distribution: distribution
    });

  } catch (error) {
    console.error('Error calculating airdrop distribution:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to calculate airdrop distribution' 
    }, { status: 500 });
  } finally {
    client.release();
  }
}
