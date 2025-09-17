import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      pendingCommentId, 
      action, // 'approve' or 'reject'
      adminFid,
      reviewNotes 
    } = body;

    // Check if admin is the promoter (owner of the promotion) OR has admin key
    const adminKey = request.headers.get('x-admin-key');
    const isAdmin = adminKey === 'admin-key-123';
    
    if (!pendingCommentId || !action) {
      return NextResponse.json({ error: 'Missing required fields: pendingCommentId and action are required' }, { status: 400 });
    }
    
    // If not admin, require adminFid
    if (!isAdmin && !adminFid) {
      return NextResponse.json({ error: 'Missing required fields: adminFid is required when not using admin key' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject' }, { status: 400 });
    }

    // Get the pending comment
    const pendingComment = await sql`
      SELECT pc.*, p.fid as promoter_fid, p.username as promoter_username
      FROM pending_comments pc
      JOIN promotions p ON pc.promotion_id = p.id
      WHERE pc.id = ${pendingCommentId} AND pc.status = 'pending'
    `;

    if (pendingComment.length === 0) {
      return NextResponse.json({ error: 'Pending comment not found or already reviewed' }, { status: 404 });
    }

    const comment = pendingComment[0];

    if (comment.promoter_fid !== adminFid && !isAdmin) {
      return NextResponse.json({ error: 'Only the promotion owner or admin can approve comments' }, { status: 403 });
    }

    // Update the pending comment status
    await sql`
      UPDATE pending_comments 
      SET status = ${action === 'approve' ? 'approved' : 'rejected'},
          reviewed_at = NOW(),
          reviewed_by = ${adminFid},
          review_notes = ${reviewNotes || null}
      WHERE id = ${pendingCommentId}
    `;

    if (action === 'approve') {
      // Credit the reward to the user
      const result = await sql`
        INSERT INTO shares (
          promotion_id, sharer_fid, sharer_username, cast_hash, reward_amount
        ) VALUES (
          ${comment.promotion_id}, ${comment.user_fid}, ${comment.username}, ${comment.cast_hash}, ${comment.reward_amount}
        )
        RETURNING id
      `;

      const actionId = result[0].id;

      // Update promotion budget
      await sql`
        UPDATE promotions 
        SET remaining_budget = remaining_budget - ${comment.reward_amount},
            shares_count = shares_count + 1,
            updated_at = NOW()
        WHERE id = ${comment.promotion_id}
      `;

      // Update user earnings
      await sql`
        INSERT INTO users (fid, username, total_earnings, total_shares, updated_at)
        VALUES (${comment.user_fid}, ${comment.username}, 0, 1, NOW())
        ON CONFLICT (fid) 
        DO UPDATE SET 
          total_earnings = users.total_earnings + ${comment.reward_amount},
          total_shares = users.total_shares + 1,
          updated_at = NOW()
      `;

      console.log(`✅ Comment ${pendingCommentId} approved and reward credited`);

      return NextResponse.json({ 
        success: true, 
        actionId,
        message: 'Comment approved and reward credited successfully!',
        rewardAmount: comment.reward_amount
      }, { status: 200 });
    } else {
      console.log(`❌ Comment ${pendingCommentId} rejected`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Comment rejected. No reward credited.',
        reviewNotes: reviewNotes
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error('API Error in POST /api/admin/approve-comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
