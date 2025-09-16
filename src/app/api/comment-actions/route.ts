import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

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

    if (!promotionId || !userFid || !username || !actionType || !castHash || !rewardAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already completed this action
    const existingAction = await sql`
      SELECT id FROM shares 
      WHERE promotion_id = ${promotionId} AND sharer_fid = ${userFid}
    `;

    if (existingAction.length > 0) {
      return NextResponse.json({ error: 'You have already completed this comment action' }, { status: 409 });
    }

    // Check if promotion exists and is active
    const promotion = await sql`
      SELECT id, remaining_budget, reward_per_share, status, action_type 
      FROM promotions 
      WHERE id = ${promotionId} AND status = 'active'
    `;

    if (promotion.length === 0) {
      return NextResponse.json({ error: 'Promotion not found or not active' }, { status: 404 });
    }

    const promo = promotion[0];

    // Check if promotion has enough budget
    if (promo.remaining_budget < rewardAmount) {
      return NextResponse.json({ error: 'Promotion budget exhausted' }, { status: 400 });
    }

    // Check if action type matches
    if (promo.action_type !== 'comment') {
      return NextResponse.json({ error: 'This promotion is not for comment actions' }, { status: 400 });
    }

    // Simple trust-based validation - user claims they posted the comment
    console.log('🔍 Trust-based comment validation...');
    console.log('📝 Comment text:', proofUrl);
    console.log('👤 User FID:', userFid);
    console.log('🔗 Cast hash:', castHash);
    
    // For now, we trust the user that they posted the comment
    // This can be enhanced later with more sophisticated validation
    const validationData = {
      validated: true,
      comment: {
        hash: 'trust-validation-' + Date.now(),
        text: proofUrl,
        author: { fid: userFid },
        parent: { hash: castHash },
        timestamp: new Date().toISOString()
      },
      message: 'Comment validated using trust-based approach',
      validationMethod: 'trust-based'
    };

    console.log('✅ Comment validation successful (trust-based):', validationData.comment?.hash);

    // Record the comment action in shares table
    const result = await sql`
      INSERT INTO shares (
        promotion_id, sharer_fid, sharer_username, cast_hash, reward_amount
      ) VALUES (
        ${promotionId}, ${userFid}, ${username}, ${castHash}, ${rewardAmount}
      )
      RETURNING id
    `;

    const actionId = result[0].id;

    // Update promotion budget
    await sql`
      UPDATE promotions 
      SET remaining_budget = remaining_budget - ${rewardAmount},
          shares_count = shares_count + 1,
          updated_at = NOW()
      WHERE id = ${promotionId}
    `;

    // Update user earnings
    await sql`
      INSERT INTO users (fid, username, total_earnings, total_shares, updated_at)
      VALUES (${userFid}, ${username}, 0, 1, NOW())
      ON CONFLICT (fid) 
      DO UPDATE SET 
        total_earnings = users.total_earnings + ${rewardAmount},
        total_shares = users.total_shares + 1,
        updated_at = NOW()
    `;

    return NextResponse.json({ 
      success: true, 
      actionId,
      validatedComment: validationData.comment,
      message: 'Comment validated and reward credited successfully!' 
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Error in POST /api/comment-actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
