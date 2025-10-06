import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { verifyWithRetry, parseCastUrl } from '@/lib/farcaster-verification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      promotionId, 
      userFid, 
      username, 
      actionType, 
      castHash, 
      rewardAmount, 
      proofUrl 
    } = body;

    console.log('🚀 Follow API called:', {
      promotionId,
      userFid,
      username,
      actionType,
      castHash,
      rewardAmount
    });

    // Validate required fields
    if (!promotionId || !userFid || !castHash || !rewardAmount) {
      return NextResponse.json({ 
        error: 'Missing required fields: promotionId, userFid, castHash, rewardAmount' 
      }, { status: 400 });
    }

    // Check if promotion exists and has enough budget
    console.log('🔍 Checking promotion:', { promotionId, status: 'active', actionType: 'follow' });
    
    const promotionResult = await pool.query(
      'SELECT * FROM promotions WHERE id = $1 AND status = $2 AND action_type = $3',
      [promotionId, 'active', 'follow']
    );

    console.log('🔍 Promotion query result:', {
      rowCount: promotionResult.rows.length,
      promotion: promotionResult.rows[0] || null
    });

    if (promotionResult.rows.length === 0) {
      // Try to find the promotion with any action_type for debugging
      const debugResult = await pool.query(
        'SELECT id, status, action_type FROM promotions WHERE id = $1',
        [promotionId]
      );
      
      console.log('🔍 Debug - promotion exists with different criteria:', debugResult.rows[0] || 'NOT FOUND');
      
      return NextResponse.json({ 
        error: 'Promotion not found, not active, or not a follow promotion',
        debug: debugResult.rows[0] || null
      }, { status: 404 });
    }

    const promotion = promotionResult.rows[0];

    // Check if user already completed this action
    const existingAction = await pool.query(
      'SELECT id FROM follow_actions WHERE promotion_id = $1 AND user_fid = $2',
      [promotionId, userFid]
    );

    if (existingAction.rows.length > 0) {
      return NextResponse.json({ 
        error: 'You have already completed this follow action' 
      }, { status: 409 });
    }

    // Check if promotion has enough budget
    if (promotion.remaining_budget < rewardAmount) {
      return NextResponse.json({ 
        error: 'Promotion budget exhausted' 
      }, { status: 400 });
    }

    // Simple trust-based validation - user claims they followed
    console.log('🔍 Trust-based follow validation...');
    console.log('👤 User FID:', userFid);
    console.log('🔗 Cast hash:', castHash);
    
    // For now, we trust the user that they followed
    // This can be enhanced later with more sophisticated validation
    const validationData = {
      validated: true,
      follow: {
        hash: 'trust-validation-' + Date.now(),
        follower: { fid: userFid },
        target: { hash: castHash },
        timestamp: new Date().toISOString()
      },
      message: 'Follow validated using trust-based approach',
      validationMethod: 'trust-based'
    };

    console.log('✅ Follow validation successful (trust-based):', validationData.follow?.hash);

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log('🔄 Transaction started');

      // Insert follow action
      console.log(`🔄 Inserting follow action for user ${userFid} on promotion ${promotionId}`);
      
      const followActionResult = await client.query(`
        INSERT INTO follow_actions (
          promotion_id, user_fid, username, action_type, cast_hash, 
          reward_amount, status, verified_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
        RETURNING id, action_type, created_at
      `, [promotionId, userFid, username, actionType, castHash, rewardAmount, 'verified']);

      console.log(`✅ Follow action inserted:`, followActionResult.rows[0]);

      // Add season points for follow action
      try {
        // Get current active season ID
        const seasonResult = await client.query(
          'SELECT id FROM seasons WHERE status = $1 ORDER BY created_at DESC LIMIT 1',
          ['active']
        );
        
        if (seasonResult.rows.length > 0) {
          const seasonId = seasonResult.rows[0].id;
          
          // Add point transaction
          await client.query(`
            INSERT INTO point_transactions (
              user_fid, season_id, action_type, points_earned, metadata
            ) VALUES ($1, $2, $3, $4, $5)
          `, [userFid, seasonId, 'follow', 1, JSON.stringify({ 
            promotion_id: promotionId,
            cast_hash: castHash,
            timestamp: new Date().toISOString()
          })]);

          // Update user season summary
          await client.query(`
            INSERT INTO user_season_summary (
              user_fid, season_id, total_points, total_follows, 
              last_activity
            ) VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (user_fid, season_id) 
            DO UPDATE SET 
              total_points = user_season_summary.total_points + $3,
              total_follows = user_season_summary.total_follows + $4,
              last_activity = NOW(),
              updated_at = NOW()
          `, [userFid, seasonId, 1, 1]);

          console.log(`✅ Season points added for follow action`);
        }
      } catch (seasonError) {
        console.warn('⚠️ Season tracking failed (non-critical):', seasonError);
        // Don't fail the main transaction for season tracking
      }

      // Update promotion stats
      await client.query(`
        UPDATE promotions 
        SET 
          shares_count = shares_count + 1,
          remaining_budget = remaining_budget - $1,
          updated_at = NOW()
        WHERE id = $2
      `, [rewardAmount, promotionId]);

      // Update user earnings
      await client.query(`
        INSERT INTO users (fid, username, total_earnings, total_shares, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (fid) 
        DO UPDATE SET 
          total_earnings = users.total_earnings + $3,
          total_shares = users.total_shares + $4,
          updated_at = NOW()
      `, [userFid, username, rewardAmount, 1]);

      // Check if promotion should be marked as completed
      const updatedPromoResult = await client.query(
        'SELECT remaining_budget, reward_per_share FROM promotions WHERE id = $1',
        [promotionId]
      );

      const updatedPromo = updatedPromoResult.rows[0];
      let completionInserted = false;

      if (updatedPromo && updatedPromo.remaining_budget <= 0) {
        await client.query('UPDATE promotions SET status = $1 WHERE id = $2', ['completed', promotionId]);
        console.log(`Campaign ${promotionId} marked as completed - budget exhausted`);
        completionInserted = true;
      } else if (updatedPromo && updatedPromo.remaining_budget < updatedPromo.reward_per_share) {
        await client.query('UPDATE promotions SET status = $1 WHERE id = $2', ['completed', promotionId]);
        console.log(`Campaign ${promotionId} marked as completed - insufficient budget for next follow`);
        completionInserted = true;
      }

      await client.query('COMMIT');

      console.log('✅ Follow action completed successfully:', {
        promotionId,
        userFid,
        totalReward: rewardAmount,
        completionInserted
      });

      return NextResponse.json({
        success: true,
        message: completionInserted 
          ? `Follow completed! Earned ${rewardAmount} $CHESS. Campaign finished!` 
          : `Follow completed! Earned ${rewardAmount} $CHESS`,
        totalReward: rewardAmount,
        completionInserted,
        remainingBudget: promotion.remaining_budget - rewardAmount
      }, { status: 200 });

    } catch (error: any) {
      console.error('❌ Transaction error, rolling back:', error.message);
      try {
        await client.query('ROLLBACK');
        console.log('🔄 Transaction rolled back successfully');
      } catch (rollbackError: any) {
        console.error('❌ Rollback failed:', rollbackError.message);
      }
      throw error;
    } finally {
      client.release();
      console.log('🔌 Database connection released');
    }

  } catch (error: any) {
    console.error('❌ Follow API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// GET endpoint to check user's follow actions for a promotion
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promotionId = searchParams.get('promotionId');
    const userFid = searchParams.get('userFid');

    if (!promotionId || !userFid) {
      return NextResponse.json({ 
        error: 'Missing required parameters: promotionId, userFid' 
      }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT * FROM follow_actions WHERE promotion_id = $1 AND user_fid = $2',
      [promotionId, userFid]
    );

    return NextResponse.json({
      success: true,
      actions: result.rows
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Follow GET API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}