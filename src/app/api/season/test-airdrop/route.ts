import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { testAmount = 1000, testFids = [], userFid, distribute = false } = await request.json();

    if (!testAmount || testAmount <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Test amount must be greater than 0' 
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

    console.log(`🧪 Testing airdrop with ${testAmount} CHESS for FIDs:`, testFids);

    // Get current active season
    const seasonResult = await client.query(`
      SELECT id, name FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
    `);

    if (seasonResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active season found' 
      }, { status: 404 });
    }

    const season = seasonResult.rows[0];
    const seasonId = season.id;

    // Get test users - either specific FIDs or all users with points
    let usersQuery = `
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
    `;

    // If specific FIDs provided, filter by them
    if (testFids.length > 0) {
      usersQuery += ` AND user_fid = ANY($2)`;
    }

    usersQuery += ` ORDER BY total_points DESC`;

    const usersResult = await client.query(usersQuery, 
      testFids.length > 0 ? [seasonId, testFids] : [seasonId]
    );

    const users = usersResult.rows;
    
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users found for testing',
        distribution: []
      });
    }

    // Calculate total points
    const totalPoints = users.reduce((sum, user) => sum + parseInt(user.total_points), 0);
    
    console.log(`📊 Test: Found ${users.length} users with ${totalPoints} total points`);

    if (users.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No users found with points for this season' 
      }, { status: 404 });
    }

    if (totalPoints === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No points found for any users in this season' 
      }, { status: 404 });
    }

    // Convert test amount to wei
    const testAmountWei = BigInt(testAmount) * BigInt(1000000000000000000); // Convert to wei

    // Calculate proportional rewards
    let distribution;
    try {
      distribution = users.map((user, index) => {
        const userPoints = parseInt(user.total_points);
        const percentage = totalPoints > 0 ? (userPoints / totalPoints) * 100 : 0;
        const rewardAmount = totalPoints > 0 ? 
          (BigInt(userPoints) * testAmountWei) / BigInt(totalPoints) : 
          BigInt(0);
        
        return {
          rank: index + 1,
          user_fid: user.user_fid,
          points: userPoints,
          percentage: parseFloat(percentage.toFixed(4)),
          reward_amount: rewardAmount,
          reward_amount_formatted: (Number(rewardAmount) / 1000000000000000000).toFixed(6) + ' CHESS'
        };
      });
    } catch (distributionError) {
      console.error('❌ Error calculating distribution:', distributionError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to calculate distribution: ' + (distributionError instanceof Error ? distributionError.message : String(distributionError))
      }, { status: 500 });
    }

    // Calculate remaining amount (due to rounding)
    const distributedAmount = distribution.reduce((sum, user) => sum + user.reward_amount, BigInt(0));
    const remainingAmount = testAmountWei - distributedAmount;
    
    console.log(`💰 Test distribution: ${Number(distributedAmount) / 1000000000000000000} CHESS distributed, ${Number(remainingAmount) / 1000000000000000000} CHESS remaining`);

    // Insert rewards into airdrop_claims table (separate from shares to avoid FK constraint issues)
    if (distribute) {
      console.log('📝 Inserting rewards into airdrop_claims table...');
      for (const user of distribution) {
        try {
          // Convert from wei to CHESS (divide by 10^18 for human readable amount)
          const rewardAmountInCHESS = Number(user.reward_amount) / 1000000000000000000;
          
          await client.query(`
            INSERT INTO airdrop_claims (user_fid, season_id, points_used, reward_amount, status)
            VALUES ($1, $2, $3, $4, 'pending')
            ON CONFLICT DO NOTHING
          `, [user.user_fid, seasonId, user.points, rewardAmountInCHESS]);
          console.log(`✅ Rewards inserted into airdrop_claims for FID ${user.user_fid}: ${user.reward_amount_formatted}`);
        } catch (insertError) {
          console.error(`❌ Failed to insert rewards for FID ${user.user_fid}:`, insertError);
        }
      }
    }

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
      test_mode: true,
      season_id: seasonId,
      season_name: season.name,
      test_amount: testAmount,
      test_amount_wei: testAmountWei.toString(),
      total_reward_amount: testAmountWei.toString(),
      total_users: users.length,
      total_points: totalPoints,
      distributed_amount: distributedAmount.toString(),
      remaining_amount: remainingAmount.toString(),
      distribution: distribution.map(user => ({
        ...user,
        reward_amount: user.reward_amount.toString()
      })),
      message: `Test distribution calculated for ${users.length} users with ${testAmount} CHESS total`
    });

  } catch (error) {
    console.error('Error in test airdrop calculation:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to calculate test airdrop distribution' 
    }, { status: 500 });
  } finally {
    client.release();
  }
}
