import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { seasonId, distributeNow = false } = await request.json();
    
    if (!seasonId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Season ID is required' 
      }, { status: 400 });
    }

    console.log(`🎯 ${distributeNow ? 'Distributing' : 'Calculating'} airdrop for Season ${seasonId} based on points`);

    // Get season info
    const seasonResult = await client.query(`
      SELECT id, name, total_rewards, status FROM seasons WHERE id = $1
    `, [seasonId]);

    if (seasonResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Season not found' 
      }, { status: 404 });
    }

    const season = seasonResult.rows[0];
    
    if (season.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Season must be completed before distributing airdrops' 
      }, { status: 400 });
    }

    // Calculate distribution based on points
    const totalRewardAmount = parseInt(season.total_rewards) * 1000000000000000000;
    
    const calculateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/season/calculate-airdrop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId, totalRewardAmount })
    });

    if (!calculateResponse.ok) {
      throw new Error('Failed to calculate airdrop distribution');
    }

    const { distribution } = await calculateResponse.json();

    if (distribution.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to distribute rewards to',
        season_id: seasonId,
        distribution: []
      });
    }

    if (!distributeNow) {
      // Just return the calculated distribution
      return NextResponse.json({
        success: true,
        message: 'Airdrop distribution calculated based on points',
        season_id: seasonId,
        total_reward_amount: totalRewardAmount,
        total_users: distribution.length,
        distribution: distribution.map((user: any) => ({
          user_fid: user.user_fid,
          points: user.points,
          percentage: user.percentage,
          reward_amount: user.reward_amount,
          reward_amount_formatted: user.reward_amount_formatted
        }))
      });
    }

    // Actually distribute the airdrop
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const user of distribution) {
      try {
        // Record airdrop claim
        await client.query(`
          INSERT INTO airdrop_claims (
            user_fid, season_id, points_used, reward_amount, 
            status, transaction_hash, claimed_at, distribution_reason
          ) VALUES ($1, $2, $3, $4, 'distributed', $5, NOW(), $6)
        `, [
          user.user_fid, 
          seasonId, 
          user.points, 
          user.reward_amount, 
          'AUTO_DISTRIBUTION_' + Date.now(),
          `Points-based distribution: ${user.points} points (${user.percentage}%)`
        ]);

        results.push({
          user_fid: user.user_fid,
          points: user.points,
          percentage: user.percentage,
          reward_amount: user.reward_amount,
          reward_amount_formatted: user.reward_amount_formatted,
          status: 'distributed',
          transaction_hash: 'AUTO_DISTRIBUTION_' + Date.now()
        });

        successCount++;

      } catch (error: any) {
        console.error(`❌ Failed to distribute to FID ${user.user_fid}:`, error.message);
        
        results.push({
          user_fid: user.user_fid,
          points: user.points,
          percentage: user.percentage,
          reward_amount: user.reward_amount,
          reward_amount_formatted: user.reward_amount_formatted,
          status: 'error',
          error: error.message,
          transaction_hash: null
        });

        errorCount++;
      }
    }

    console.log(`✅ Airdrop distributed: ${successCount} successful, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: 'Airdrop distributed successfully based on points',
      season_id: seasonId,
      total_users: distribution.length,
      successful_distributions: successCount,
      failed_distributions: errorCount,
      results: results
    });

  } catch (error) {
    console.error('❌ Failed to record manual airdrop:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to record manual airdrop: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
