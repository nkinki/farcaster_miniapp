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
      targetUserFid, // Changed from castHash to targetUserFid
      rewardAmount, 
      proofUrl 
    } = body;

    console.log('🚀 Follow API called:', {
      promotionId,
      userFid,
      username,
      actionType,
      targetUserFid,
      rewardAmount
    });

    // Validate required fields
    if (!promotionId || !userFid || !targetUserFid || !rewardAmount) {
      return NextResponse.json({ 
        error: 'Missing required fields: promotionId, userFid, targetUserFid, rewardAmount' 
      }, { status: 400 });
    }

    // Validate targetUserFid is not empty string or 0
    if (!targetUserFid || targetUserFid === '0' || targetUserFid === 0) {
      return NextResponse.json({ 
        error: 'Invalid target user identifier. Please provide a valid username or FID.' 
      }, { status: 400 });
    }

    // Check if follow_actions table exists first
    try {
      console.log('🔍 Checking follow_actions table exists...');
      await pool.query('SELECT 1 FROM follow_actions LIMIT 1');
      console.log('✅ follow_actions table exists');
    } catch (error: any) {
      console.log('❌ follow_actions table check failed:', error.message);
      if (error.code === '42P01') { // Table doesn't exist
        return NextResponse.json({ 
          error: 'Follow functionality is not available yet. Database migration required.' 
        }, { status: 503 });
      }
      throw error;
    }

    // Check if promotion exists and has enough budget
    console.log('🔍 Checking promotion:', { promotionId, status: 'active', actionType: 'follow' });
    
    // First check if promotion exists (without action_type filter)
    console.log('🔍 Querying promotion by ID:', promotionId);
    const promotionCheckResult = await pool.query(
      'SELECT id, status, action_type FROM promotions WHERE id = $1',
      [promotionId]
    );
    console.log('✅ Promotion query result:', promotionCheckResult.rows);
    
    if (promotionCheckResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Promotion not found' 
      }, { status: 404 });
    }
    
    const promotion = promotionCheckResult.rows[0];
    console.log('🔍 Found promotion:', promotion);
    
    // Check if it's a follow promotion
    if (promotion.action_type !== 'follow') {
      return NextResponse.json({ 
        error: 'This promotion is not a follow promotion',
        actualActionType: promotion.action_type
      }, { status: 400 });
    }
    
    // Check if promotion is active
    if (promotion.status !== 'active') {
      return NextResponse.json({ 
        error: 'Promotion is not active',
        actualStatus: promotion.status
      }, { status: 400 });
    }
    
    // Get full promotion data
    const promotionResult = await pool.query(
      'SELECT * FROM promotions WHERE id = $1',
      [promotionId]
    );

    console.log('🔍 Promotion query result:', {
      rowCount: promotionResult.rows.length,
      promotion: promotionResult.rows[0] || null
    });

    if (promotionResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Promotion not found' 
      }, { status: 404 });
    }

    const fullPromotion = promotionResult.rows[0];

  // Check if user already completed this action
  const existingAction = await pool.query(
    'SELECT id, status FROM follow_actions WHERE promotion_id = $1 AND user_fid = $2',
    [promotionId, userFid]
  );

  if (existingAction.rows.length > 0) {
    const action = existingAction.rows[0];
    return NextResponse.json({ 
      error: `You have already completed this follow action (Status: ${action.status})`,
      actionId: action.id,
      status: action.status
    }, { status: 409 });
  }

  // Check if user already has a pending follow for this promotion
  // First check if pending_follows table exists
  let existingPendingFollow;
  try {
    existingPendingFollow = await pool.query(
      'SELECT id FROM pending_follows WHERE promotion_id = $1 AND user_fid = $2 AND status = $3',
      [promotionId, userFid, 'pending']
    );
  } catch (tableError: any) {
    if (tableError.code === '42P01') { // Table doesn't exist
      console.log('⚠️ pending_follows table does not exist yet, skipping check');
      existingPendingFollow = { rows: [] };
    } else {
      throw tableError;
    }
  }

  if (existingPendingFollow.rows.length > 0) {
    return NextResponse.json({ 
      error: 'You already have a pending follow for this promotion' 
    }, { status: 409 });
  }

    // Check if promotion has enough budget
    if (fullPromotion.remaining_budget < rewardAmount) {
      return NextResponse.json({ 
        error: 'Promotion budget exhausted' 
      }, { status: 400 });
    }

    // Reserve budget immediately when follow is submitted (pending)
    // This prevents multiple users from exhausting the budget
    await pool.query(`
      UPDATE promotions 
      SET remaining_budget = remaining_budget - $1,
          updated_at = NOW()
      WHERE id = $2
    `, [rewardAmount, promotionId]);

    // Extract target username from cast URL
    const targetUsername = fullPromotion.cast_url.split('/').pop() || '';

  // Check if pending_follows table exists first
  console.log('🔍 Checking pending_follows table exists...');
  try {
    await pool.query('SELECT 1 FROM pending_follows LIMIT 1');
    console.log('✅ pending_follows table exists');
  } catch (tableError: any) {
    console.log('❌ pending_follows table check failed:', tableError.message);
    if (tableError.code === '42P01') { // Table doesn't exist
      console.log('⚠️ pending_follows table does not exist, falling back to direct follow action');
      
      // Fallback: Create direct follow action
      const result = await pool.query(`
        INSERT INTO follow_actions (
          promotion_id, user_fid, username, action_type, cast_hash, 
          reward_amount, status, verified_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'follow', $4, $5, 'verified', NOW(), NOW(), NOW()
        )
        RETURNING id
      `, [promotionId, userFid, username, targetUsername, rewardAmount]);

      const actionId = result.rows[0].id;

      // Update promotion stats
      await pool.query(`
        UPDATE promotions 
        SET shares_count = shares_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [promotionId]);

      // Update user earnings
      await pool.query(`
        INSERT INTO users (fid, username, total_earnings, total_shares, updated_at)
        VALUES ($1, $2, 0, 1, NOW())
        ON CONFLICT (fid) 
        DO UPDATE SET 
          total_earnings = users.total_earnings + $3,
          total_shares = users.total_shares + 1,
          updated_at = NOW()
      `, [userFid, username, rewardAmount]);

      return NextResponse.json({
        success: true,
        message: 'Follow action completed! (Direct mode - pending table not available)',
        actionId,
        targetUsername
      }, { status: 200 });
    } else {
      throw tableError;
    }
  }

  // Create pending follow for admin approval
  console.log('📝 Creating pending follow for admin approval...');
  
  try {
      const result = await pool.query(`
        INSERT INTO pending_follows (
          promotion_id, user_fid, username, target_username, target_user_fid, reward_amount, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'pending'
        )
        RETURNING id
      `, [promotionId, userFid, username, targetUsername, targetUserFid, rewardAmount]);

    const pendingFollowId = result.rows[0].id;

    console.log(`📝 Created pending follow ${pendingFollowId} for admin approval`);

      // NO immediate reward - wait for admin approval
      console.log('⏳ Follow action submitted for admin approval - no immediate reward');

    return NextResponse.json({
      success: true,
      message: 'Follow submitted for admin approval! Reward will be credited after approval.',
      pendingFollowId,
      targetUsername
    }, { status: 200 });

  } catch (tableError: any) {
    console.error('❌ Error creating pending follow:', tableError);
    throw tableError;
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