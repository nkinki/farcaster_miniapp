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
      'SELECT id FROM follow_actions WHERE promotion_id = $1 AND user_fid = $2',
      [promotionId, userFid]
    );

    if (existingAction.rows.length > 0) {
      return NextResponse.json({ 
        error: 'You have already completed this follow action' 
      }, { status: 409 });
    }

    // Check if user already has a pending follow for this promotion
    const existingPendingFollow = await pool.query(
      'SELECT id FROM pending_follows WHERE promotion_id = $1 AND user_fid = $2 AND status = $3',
      [promotionId, userFid, 'pending']
    );

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

    // Create pending follow for admin approval
    console.log('📝 Creating pending follow for admin approval...');
    
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

    return NextResponse.json({
      success: true,
      message: 'Follow submitted for admin approval! Reward will be credited after review.',
      pendingFollowId,
      targetUsername
    }, { status: 200 });

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