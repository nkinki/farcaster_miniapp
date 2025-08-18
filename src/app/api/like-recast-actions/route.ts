import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

// Get like/recast actions for a user or promotion
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userFid = searchParams.get('userFid');
    const promotionId = searchParams.get('promotionId');
    const status = searchParams.get('status') || 'all';

    let actions;
    
    if (userFid && promotionId) {
      // Get specific user's actions for a specific promotion
      if (status === 'all') {
        actions = await sql`
          SELECT * FROM like_recast_actions 
          WHERE user_fid = ${userFid} AND promotion_id = ${promotionId}
          ORDER BY created_at DESC
        `;
      } else {
        actions = await sql`
          SELECT * FROM like_recast_actions 
          WHERE user_fid = ${userFid} AND promotion_id = ${promotionId} AND status = ${status}
          ORDER BY created_at DESC
        `;
      }
    } else if (userFid) {
      // Get all actions for a user
      if (status === 'all') {
        actions = await sql`
          SELECT lra.*, p.cast_url, p.reward_per_share, p.total_budget
          FROM like_recast_actions lra
          JOIN promotions p ON lra.promotion_id = p.id
          WHERE lra.user_fid = ${userFid}
          ORDER BY lra.created_at DESC
        `;
      } else {
        actions = await sql`
          SELECT lra.*, p.cast_url, p.reward_per_share, p.total_budget
          FROM like_recast_actions lra
          JOIN promotions p ON lra.promotion_id = p.id
          WHERE lra.user_fid = ${userFid} AND lra.status = ${status}
          ORDER BY lra.created_at DESC
        `;
      }
    } else if (promotionId) {
      // Get all actions for a promotion
      if (status === 'all') {
        actions = await sql`
          SELECT * FROM like_recast_actions 
          WHERE promotion_id = ${promotionId}
          ORDER BY created_at DESC
        `;
      } else {
        actions = await sql`
          SELECT * FROM like_recast_actions 
          WHERE promotion_id = ${promotionId} AND status = ${status}
          ORDER BY created_at DESC
        `;
      }
    } else {
      // Get all actions (admin view)
      if (status === 'all') {
        actions = await sql`
          SELECT lra.*, p.cast_url, p.username as promotion_owner
          FROM like_recast_actions lra
          JOIN promotions p ON lra.promotion_id = p.id
          ORDER BY lra.created_at DESC
          LIMIT 100
        `;
      } else {
        actions = await sql`
          SELECT lra.*, p.cast_url, p.username as promotion_owner
          FROM like_recast_actions lra
          JOIN promotions p ON lra.promotion_id = p.id
          WHERE lra.status = ${status}
          ORDER BY lra.created_at DESC
          LIMIT 100
        `;
      }
    }

    return NextResponse.json({ actions }, { status: 200 });
  } catch (error: any) {
    console.error('API Error in GET /api/like-recast-actions:', error);
    return NextResponse.json({ error: 'Failed to fetch like/recast actions' }, { status: 500 });
  }
}

// Submit a new like/recast action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      promotionId, userFid, username, actionType, castHash, proofUrl, rewardAmount 
    } = body;

    // Validate required fields
    if (!promotionId || !userFid || !username || !actionType || !castHash || !rewardAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate action type
    if (!['like', 'recast'].includes(actionType)) {
      return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    // Check if user already performed this action for this promotion
    const existingAction = await sql`
      SELECT id FROM like_recast_actions 
      WHERE promotion_id = ${promotionId} AND user_fid = ${userFid} AND action_type = ${actionType}
    `;

    if (existingAction.length > 0) {
      return NextResponse.json({ 
        error: `You have already ${actionType}d this promotion` 
      }, { status: 409 });
    }

    // Check if promotion exists and is active
    const promotion = await sql`
      SELECT id, status, action_type, remaining_budget 
      FROM promotions 
      WHERE id = ${promotionId} AND status = 'active' AND action_type = 'like_recast'
    `;

    if (promotion.length === 0) {
      return NextResponse.json({ 
        error: 'Promotion not found or not active for like/recast actions' 
      }, { status: 404 });
    }

    // Check if promotion has enough budget
    if (promotion[0].remaining_budget < rewardAmount) {
      return NextResponse.json({ 
        error: 'Promotion has insufficient budget' 
      }, { status: 400 });
    }

    // Insert the new action
    const [newAction] = await sql`
      INSERT INTO like_recast_actions (
        promotion_id, user_fid, username, action_type, cast_hash, 
        proof_url, reward_amount, status
      ) VALUES (
        ${promotionId}, ${userFid}, ${username}, ${actionType}, ${castHash},
        ${proofUrl || null}, ${rewardAmount}, 'pending'
      )
      RETURNING id, created_at;
    `;

    // ALSO create a shares record for frontend compatibility
    await sql`
      INSERT INTO shares (promotion_id, sharer_fid, sharer_username, cast_hash, reward_amount, action_type)
      VALUES (${promotionId}, ${userFid}, ${username}, ${castHash}, ${rewardAmount}, 'like_recast')
    `;

    return NextResponse.json({ 
      success: true, 
      actionId: newAction.id,
      message: `${actionType} action submitted successfully. Pending verification.`,
      created_at: newAction.created_at
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Error in POST /api/like-recast-actions:', error);
    return NextResponse.json({ error: 'Failed to submit action' }, { status: 500 });
  }
}

// Update action status (verify/reject/reward)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { actionId, status, adminNote } = body;

    // Validate required fields
    if (!actionId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate status
    if (!['pending', 'verified', 'rewarded', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get current action
    const currentAction = await sql`
      SELECT * FROM like_recast_actions WHERE id = ${actionId}
    `;

    if (currentAction.length === 0) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    const action = currentAction[0];

    // Update action status
    const updateFields: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'verified') {
      updateFields.verified_at = new Date().toISOString();
    } else if (status === 'rewarded') {
      updateFields.rewarded_at = new Date().toISOString();
      
      // Update promotion budget and user stats
      await sql`
        UPDATE promotions 
        SET remaining_budget = remaining_budget - ${action.reward_amount}
        WHERE id = ${action.promotion_id}
      `;

      // Update user stats
      await sql`
        INSERT INTO users (fid, username, total_earnings, pending_rewards)
        VALUES (${action.user_fid}, ${action.username}, ${action.reward_amount}, ${action.reward_amount})
        ON CONFLICT (fid) DO UPDATE SET
          total_earnings = users.total_earnings + ${action.reward_amount},
          pending_rewards = users.pending_rewards + ${action.reward_amount}
      `;
    }

    await sql`
      UPDATE like_recast_actions 
      SET status = ${status}, 
          verified_at = ${updateFields.verified_at || null},
          rewarded_at = ${updateFields.rewarded_at || null},
          updated_at = ${updateFields.updated_at}
      WHERE id = ${actionId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: `Action ${status} successfully` 
    }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in PATCH /api/like-recast-actions:', error);
    return NextResponse.json({ error: 'Failed to update action' }, { status: 500 });
  }
}