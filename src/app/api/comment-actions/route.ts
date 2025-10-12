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

    // Check if user already completed this action (only check pending_comments, not shares)
    // The shares table is used for completed-actions API, not for conflict checking

    // Check if user already has a pending comment for this promotion
    const existingPendingComment = await sql`
      SELECT id FROM pending_comments 
      WHERE promotion_id = ${promotionId} AND user_fid = ${userFid} AND status = 'pending'
    `;

    if (existingPendingComment.length > 0) {
      return NextResponse.json({ error: 'You already have a pending comment for this promotion' }, { status: 409 });
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

    // Reserve budget immediately when comment is submitted (pending)
    // This prevents multiple users from exhausting the budget
    await sql`
      UPDATE promotions 
      SET remaining_budget = remaining_budget - ${rewardAmount},
          updated_at = NOW()
      WHERE id = ${promotionId}
    `;

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

    // Create pending comment for admin approval (NO immediate reward)
    const result = await sql`
      INSERT INTO pending_comments (
        promotion_id, user_fid, username, comment_text, cast_hash, reward_amount, status
      ) VALUES (
        ${promotionId}, ${userFid}, ${username}, ${proofUrl}, ${castHash}, ${rewardAmount}, 'pending'
      )
      RETURNING id
    `;

    const pendingCommentId = result[0].id;

    console.log(`📝 Created pending comment ${pendingCommentId} for admin approval`);

    return NextResponse.json({ 
      success: true, 
      pendingCommentId,
      validatedComment: validationData.comment,
      message: 'Comment submitted for admin approval. Reward will be credited after review.',
      status: 'pending_approval'
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Error in POST /api/comment-actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
