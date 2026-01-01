import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { isDiamondVip } from '@/lib/nft-server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    // Set a reasonable timeout for this query
    await client.query('SET statement_timeout = 60000'); // 60 seconds for complex calculation
    const { seasonId, totalRewardAmount, userFid } = await request.json();

    if (!seasonId || !totalRewardAmount) {
      return NextResponse.json({
        success: false,
        error: 'Season ID and total reward amount are required'
      }, { status: 400 });
    }

    // Check daily limit for user (if userFid provided)
    if (userFid) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      const limitCheck = await client.query(`
        SELECT calculation_count FROM daily_calculation_limits 
        WHERE user_fid = $1 AND calculation_type = 'airdrop_distribution' AND last_calculation_date = $2
      `, [userFid, today]);

      if (limitCheck.rows.length > 0 && limitCheck.rows[0].calculation_count >= 1) {
        return NextResponse.json({
          success: false,
          error: 'Daily calculation limit reached. You can only calculate distribution once per day.',
          limit_reached: true,
          next_reset: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Next day
        }, { status: 429 });
      }
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

    // Recalculate points with 2x multiplier for Diamond VIPs
    const usersWithVIP = await Promise.all(users.map(async (user) => {
      const isVip = await isDiamondVip(user.user_fid);
      const basePoints = parseInt(user.total_points);
      const finalPoints = isVip ? basePoints * 2 : basePoints;

      return {
        ...user,
        base_points: basePoints,
        total_points: finalPoints,
        is_vip: isVip
      };
    }));

    // Calculate total adjusted points across all users
    const totalPoints = usersWithVIP.reduce((sum, user) => sum + user.total_points, 0);

    console.log(`📊 Found ${users.length} users. Adjusted total points: ${totalPoints} (includes VIP multipliers)`);

    // Calculate proportional rewards
    const distribution = usersWithVIP.map((user, index) => {
      const userPoints = user.total_points;
      const percentage = (userPoints / totalPoints) * 100;
      const rewardAmount = Math.floor((userPoints / totalPoints) * totalRewardAmount);

      return {
        rank: index + 1,
        user_fid: user.user_fid,
        points: userPoints,
        base_points: user.base_points,
        is_vip: user.is_vip,
        percentage: parseFloat(percentage.toFixed(4)),
        reward_amount: rewardAmount,
        reward_amount_formatted: (rewardAmount / 1000000000000000000).toFixed(2) + ' CHESS'
      };
    });

    // Re-sort by total points (VIPs might have moved up)
    distribution.sort((a, b) => b.points - a.points);
    distribution.forEach((item, i) => item.rank = i + 1);

    // Calculate remaining amount (due to rounding)
    const distributedAmount = distribution.reduce((sum, user) => sum + user.reward_amount, 0);
    const remainingAmount = totalRewardAmount - distributedAmount;

    console.log(`💰 Distribution calculated: ${distributedAmount} CHESS distributed, ${remainingAmount} CHESS remaining`);

    // Record the calculation in daily limits (if userFid provided)
    if (userFid) {
      const today = new Date().toISOString().split('T')[0];

      await client.query(`
        INSERT INTO daily_calculation_limits (user_fid, calculation_type, last_calculation_date, calculation_count)
        VALUES ($1, 'airdrop_distribution', $2, 1)
        ON CONFLICT (user_fid, calculation_type, last_calculation_date)
        DO UPDATE SET 
          calculation_count = daily_calculation_limits.calculation_count + 1,
          updated_at = NOW()
      `, [userFid, today]);
    }

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
