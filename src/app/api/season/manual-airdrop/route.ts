import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { seasonId, recipients } = await request.json();
    
    if (!seasonId || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Season ID and recipients array are required' 
      }, { status: 400 });
    }

    console.log(`🎯 Manual airdrop distribution for Season ${seasonId}`);
    console.log(`📊 Distributing to ${recipients.length} recipients`);

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

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const recipient of recipients) {
      try {
        const { user_fid, reward_amount, reason } = recipient;
        
        if (!user_fid || !reward_amount) {
          throw new Error('Missing user_fid or reward_amount');
        }

        // Convert to wei
        const amountInWei = (parseFloat(reward_amount) * 1000000000000000000).toString();
        
        // Get user's wallet address (you'll need to implement this based on your user system)
        // For now, we'll just log the distribution
        console.log(`💰 Manual airdrop: ${reward_amount} CHESS to FID ${user_fid} (${reason || 'Manual distribution'})`);
        
        // Record airdrop claim
        await client.query(`
          INSERT INTO airdrop_claims (
            user_fid, season_id, points_used, reward_amount, 
            status, transaction_hash, claimed_at, distribution_reason
          ) VALUES ($1, $2, $3, $4, 'manual_pending', $5, NOW(), $6)
        `, [
          user_fid, 
          seasonId, 
          recipient.points_used || 0, 
          amountInWei, 
          'MANUAL_DISTRIBUTION_' + Date.now(),
          reason || 'Manual distribution by administrator'
        ]);

        results.push({
          user_fid: user_fid,
          reward_amount: reward_amount,
          reward_amount_formatted: reward_amount + ' CHESS',
          status: 'recorded',
          reason: reason || 'Manual distribution',
          transaction_hash: 'MANUAL_DISTRIBUTION_' + Date.now()
        });

        successCount++;

      } catch (error: any) {
        console.error(`❌ Failed to record airdrop for FID ${recipient.user_fid}:`, error.message);
        
        results.push({
          user_fid: recipient.user_fid,
          reward_amount: recipient.reward_amount,
          reward_amount_formatted: recipient.reward_amount + ' CHESS',
          status: 'error',
          error: error.message,
          transaction_hash: null
        });

        errorCount++;
      }
    }

    console.log(`✅ Manual airdrop recorded: ${successCount} successful, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: 'Manual airdrop distribution recorded successfully',
      season_id: seasonId,
      total_recipients: recipients.length,
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
