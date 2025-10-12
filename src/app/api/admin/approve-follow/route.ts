import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pendingFollowId, action, adminFid, reviewNotes } = body;

    if (!pendingFollowId || !action || !adminFid) {
      return NextResponse.json({ 
        error: 'Missing required fields: pendingFollowId, action, adminFid' 
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "approve" or "reject"' 
      }, { status: 400 });
    }

    // Get the pending follow
    const pendingFollows = await sql`
      SELECT * FROM pending_follows WHERE id = ${pendingFollowId} AND status = 'pending'
    `;

    if (pendingFollows.length === 0) {
      return NextResponse.json({ 
        error: 'Pending follow not found or already processed' 
      }, { status: 404 });
    }

    const follow = pendingFollows[0];

    // Update the pending follow status
    await sql`
      UPDATE pending_follows 
      SET status = ${action === 'approve' ? 'approved' : 'rejected'},
          reviewed_at = NOW(),
          reviewed_by = ${adminFid},
          review_notes = ${reviewNotes || null},
          updated_at = NOW()
      WHERE id = ${pendingFollowId}
    `;

    if (action === 'approve') {
      // Credit the reward to the user
      const result = await sql`
        INSERT INTO follow_actions (
          promotion_id, user_fid, username, action_type, cast_hash, 
          reward_amount, status, verified_at, reward_claimed, created_at, updated_at
        ) VALUES (
          ${follow.promotion_id}, ${follow.user_fid}, ${follow.username}, 'follow', 
          ${follow.target_username}, ${follow.reward_amount}, 'verified', NOW(), FALSE, NOW(), NOW()
        )
        RETURNING id
      `;

      const actionId = result[0].id;

      // Update promotion stats (budget already reduced when follow was submitted)
      await sql`
        UPDATE promotions 
        SET shares_count = shares_count + 1,
            updated_at = NOW()
        WHERE id = ${follow.promotion_id}
      `;

      // Update user earnings
      await sql`
        INSERT INTO users (fid, username, total_earnings, total_shares, updated_at)
        VALUES (${follow.user_fid}, ${follow.username}, 0, 1, NOW())
        ON CONFLICT (fid) 
        DO UPDATE SET 
          total_earnings = users.total_earnings + ${follow.reward_amount},
          total_shares = users.total_shares + 1,
          updated_at = NOW()
      `;

      // Add season points for approved follow
      try {
        // Get current active season ID
        const seasonResult = await sql`
          SELECT id FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1
        `;
        
        if (seasonResult.length > 0) {
          const seasonId = seasonResult[0].id;
          
          // Add point transaction
          await sql`
            INSERT INTO point_transactions (
              user_fid, season_id, action_type, points_earned, metadata
            ) VALUES (${follow.user_fid}, ${seasonId}, 'follow', 1, ${JSON.stringify({ 
              promotion_id: follow.promotion_id,
              target_username: follow.target_username,
              timestamp: new Date().toISOString()
            })})
          `;

          // Update user season summary
          await sql`
            INSERT INTO user_season_summary (
              user_fid, season_id, total_points, total_follows, 
              last_activity
            ) VALUES (${follow.user_fid}, ${seasonId}, 1, 1, NOW())
            ON CONFLICT (user_fid, season_id) 
            DO UPDATE SET 
              total_points = user_season_summary.total_points + 1,
              total_follows = user_season_summary.total_follows + 1,
              last_activity = NOW(),
              updated_at = NOW()
          `;

          console.log(`✅ Season points added for approved follow`);
        }
      } catch (seasonError) {
        console.warn('⚠️ Season tracking failed (non-critical):', seasonError);
      }

      return NextResponse.json({
        success: true,
        message: 'Follow approved and reward credited!',
        actionId,
        rewardAmount: follow.reward_amount
      }, { status: 200 });

    } else {
      // Rejected - refund the budget
      await sql`
        UPDATE promotions 
        SET remaining_budget = remaining_budget + ${follow.reward_amount},
            updated_at = NOW()
        WHERE id = ${follow.promotion_id}
      `;

      return NextResponse.json({
        success: true,
        message: 'Follow rejected and budget refunded.',
        refundAmount: follow.reward_amount
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error('❌ Approve Follow API Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
