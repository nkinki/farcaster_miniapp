import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

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

    console.log('🚀 Like & Recast API called:', {
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
    const promotionResult = await pool.query(
      'SELECT * FROM promotions WHERE id = $1 AND status = $2 AND action_type = $3',
      [promotionId, 'active', 'like_recast']
    );

    if (promotionResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Promotion not found, not active, or not a like_recast promotion' 
      }, { status: 404 });
    }

    const promotion = promotionResult.rows[0];
    
    if (promotion.remaining_budget < rewardAmount) {
      return NextResponse.json({ 
        error: 'Insufficient budget remaining' 
      }, { status: 400 });
    }

    // Check if user already completed this promotion
    const completionResult = await pool.query(`
      SELECT * FROM like_recast_completions 
      WHERE promotion_id = $1 AND user_fid = $2
    `, [promotionId, userFid]);

    if (completionResult.rows.length > 0) {
      return NextResponse.json({ 
        error: 'You have already completed this like & recast promotion' 
      }, { status: 400 });
    }

    // Check existing actions for this user and promotion
    const existingActionsResult = await pool.query(`
      SELECT action_type FROM like_recast_user_actions 
      WHERE promotion_id = $1 AND user_fid = $2 
      AND verification_method IN ('verified', 'manual')
    `, [promotionId, userFid]);

    const existingActions = existingActionsResult.rows.map(row => row.action_type);
    
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert like and recast actions
      const actionsToInsert = actionType === 'both' ? ['like', 'recast'] : [actionType];
      const insertedActions = [];

      for (const action of actionsToInsert) {
        // Skip if already exists
        if (existingActions.includes(action)) {
          console.log(`⚠️ Action ${action} already exists for user ${userFid} on promotion ${promotionId}`);
          continue;
        }

        // Insert into like_recast_user_actions
        const userActionResult = await client.query(`
          INSERT INTO like_recast_user_actions (
            promotion_id, user_fid, action_type, cast_hash, 
            verification_method, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id, action_type, created_at
        `, [promotionId, userFid, action, castHash, 'verified']);

        // Insert into like_recast_actions (main tracking table)
        const actionResult = await client.query(`
          INSERT INTO like_recast_actions (
            promotion_id, user_fid, username, action_type, cast_hash, 
            proof_url, reward_amount, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING id, action_type, created_at
        `, [promotionId, userFid, username, action, castHash, proofUrl, Math.floor(rewardAmount / actionsToInsert.length), 'verified']);

        insertedActions.push({
          userAction: userActionResult.rows[0],
          mainAction: actionResult.rows[0]
        });
      }

      if (insertedActions.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: 'No new actions to record' 
        }, { status: 400 });
      }

      // Check if user completed both actions (like AND recast)
      const allUserActionsResult = await client.query(`
        SELECT DISTINCT action_type FROM like_recast_user_actions 
        WHERE promotion_id = $1 AND user_fid = $2 
        AND verification_method IN ('verified', 'manual')
      `, [promotionId, userFid]);

      const allUserActions = allUserActionsResult.rows.map(row => row.action_type);
      const hasLike = allUserActions.includes('like');
      const hasRecast = allUserActions.includes('recast');

      let totalReward = 0;
      let completionInserted = false;

      // If user completed both actions, create completion record and reward
      if (hasLike && hasRecast) {
        // Insert completion record
        await client.query(`
          INSERT INTO like_recast_completions (
            promotion_id, user_fid, reward_amount, verification_method, claimed_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [promotionId, userFid, rewardAmount, 'auto']);

        totalReward = rewardAmount;
        completionInserted = true;

        // Update promotion remaining budget and shares count
        await client.query(`
          UPDATE promotions 
          SET remaining_budget = remaining_budget - $1,
              shares_count = shares_count + 1,
              updated_at = NOW()
          WHERE id = $2
        `, [totalReward, promotionId]);

        // Update user balance (if users table exists)
        try {
          await client.query(`
            INSERT INTO users (fid, username, balance, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            ON CONFLICT (fid) 
            DO UPDATE SET 
              balance = users.balance + $3,
              updated_at = NOW()
          `, [userFid, username || `user_${userFid}`, totalReward]);
        } catch (userError: any) {
          console.warn('⚠️ Could not update user balance:', userError?.message || userError);
          // Continue without failing the transaction
        }

        // Update action records to 'rewarded' status
        await client.query(`
          UPDATE like_recast_actions 
          SET status = 'rewarded', rewarded_at = NOW(), updated_at = NOW()
          WHERE promotion_id = $1 AND user_fid = $2
        `, [promotionId, userFid]);
      }

      await client.query('COMMIT');

      console.log('✅ Like & Recast actions completed successfully:', {
        promotionId,
        userFid,
        actionsInserted: insertedActions.length,
        totalReward,
        completionInserted,
        hasLike,
        hasRecast
      });

      return NextResponse.json({
        success: true,
        message: completionInserted 
          ? `Both actions completed! Earned ${totalReward} $CHESS` 
          : `Recorded ${insertedActions.length} action(s). ${hasLike ? 'Like ✓' : 'Like pending'} ${hasRecast ? 'Recast ✓' : 'Recast pending'}`,
        actions: insertedActions,
        totalReward,
        completionInserted,
        hasLike,
        hasRecast,
        remainingBudget: promotion.remaining_budget - totalReward
      }, { status: 200 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Like & Recast API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

// GET endpoint to check user's actions for a promotion
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const promotionId = searchParams.get('promotionId');
    const userFid = searchParams.get('userFid');

    if (!promotionId || !userFid) {
      return NextResponse.json({ 
        error: 'Missing promotionId or userFid parameters' 
      }, { status: 400 });
    }

    const result = await pool.query(`
      SELECT action_type, verification_method, created_at, updated_at
      FROM like_recast_actions 
      WHERE promotion_id = $1 AND user_fid = $2
      ORDER BY created_at DESC
    `, [promotionId, userFid]);

    return NextResponse.json({
      actions: result.rows
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Like & Recast GET API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}