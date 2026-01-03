import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initializing database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Creating new promotion with comment functionality
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fid, username, displayName, castUrl, shareText,
      rewardPerShare, totalBudget, actionType,
      // New comment fields
      commentTemplates, customComment, allowCustomComments
    } = body;

    // Basic validation
    if (!fid || !username || !castUrl || !rewardPerShare || !totalBudget) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Security: Validate reward amounts and budgets
    if (Number(rewardPerShare) > 50000 || Number(totalBudget) > 10000000) {
      return NextResponse.json({ error: 'Reward or budget exceeds security limits.' }, { status: 400 });
    }

    // Comment validation
    if (!commentTemplates || !Array.isArray(commentTemplates)) {
      return NextResponse.json({ error: 'commentTemplates must be an array' }, { status: 400 });
    }

    if (commentTemplates.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 comment templates allowed' }, { status: 400 });
    }

    if (customComment && customComment.length > 280) {
      return NextResponse.json({ error: 'Custom comment too long (max 280 characters)' }, { status: 400 });
    }

    // Generating current timestamp
    const now = new Date();
    const blockchainHash = `promo_${fid}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;

    // Creating new promotion in the promotions_with_comments table
    const result = await pool.query(`
      INSERT INTO promotions_with_comments (
        fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, remaining_budget, status, 
        blockchain_hash, action_type, comment_templates, custom_comment, allow_custom_comments
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11, $12, $13
      )
      RETURNING id, cast_url, created_at, comment_templates, custom_comment, allow_custom_comments;
    `, [
      fid,
      username,
      displayName || null,
      castUrl,
      shareText || null,
      rewardPerShare,
      totalBudget,
      totalBudget, // remaining_budget starts equal to total_budget
      blockchainHash,
      actionType || 'quote',
      commentTemplates, // The JSONB column directly accepts the JS array, the driver stringifies it
      customComment || null,
      allowCustomComments !== false // Default true
    ]);

    const newPromotion = result.rows[0];

    // Automatic notifications trigger (non-blocking)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 1. Email notification
    try {
      const emailResponse = await fetch(`${baseUrl}/api/promotions/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: newPromotion.id,
          notificationType: 'new_promotion_with_comments'
        })
      });

      if (emailResponse.ok) {
        console.log(`✅ Promotion email sent for promotion with comments ${newPromotion.id}`);
      } else {
        console.warn(`⚠️ Failed to send promotion email for promotion with comments ${newPromotion.id}`);
      }
    } catch (emailError) {
      console.warn('⚠️ Promotion email failed (non-blocking):', emailError);
    }

    // 2. Farcaster cast notification
    try {
      const farcasterResponse = await fetch(`${baseUrl}/api/farcaster/notify-promotion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: newPromotion.id,
          username: username,
          displayName: displayName || username,
          totalBudget: totalBudget,
          rewardPerShare: rewardPerShare,
          castUrl: castUrl,
          hasComments: true,
          commentTemplates: commentTemplates,
          allowCustomComments: allowCustomComments
        })
      });

      if (farcasterResponse.ok) {
        console.log(`✅ Farcaster notification sent for promotion with comments ${newPromotion.id}`);
      } else {
        console.warn(`⚠️ Failed to send Farcaster notification for promotion with comments ${newPromotion.id}`);
      }
    } catch (farcasterError) {
      console.warn('⚠️ Farcaster notification failed (non-blocking):', farcasterError);
    }

    return NextResponse.json({
      success: true,
      promotion: {
        ...newPromotion,
        // FIXED: newPromotion.comment_templates is already a JS array because the pg driver automatically parses JSONB.
        commentTemplates: newPromotion.comment_templates || [],
        customComment: newPromotion.custom_comment,
        allowCustomComments: newPromotion.allow_custom_comments
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Error in POST /api/promotions-with-comments:', error);
    if (error.code === '23505') { // PostgreSQL unique violation error code
      return NextResponse.json({ error: 'This promotion might already exist.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error while saving promotion with comments.' }, { status: 500 });
  }
}

// Fetching promotions with comment functionality
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    const status = searchParams.get('status') || 'active';

    let query = `
      SELECT 
        id, fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, remaining_budget, status,
        blockchain_hash, action_type, comment_templates, custom_comment, allow_custom_comments,
        created_at, updated_at
      FROM promotions_with_comments
      WHERE status = $1
    `;

    const params: (string | number)[] = [status];

    if (fid) {
      query += ` AND fid = $2`;
      params.push(fid);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);

    // Comment templates arrive already parsed from the JSONB column
    const promotions = result.rows.map(row => ({
      ...row,
      // FIXED: row.comment_templates is already a JS array because the pg driver automatically parses JSONB.
      commentTemplates: row.comment_templates || [],
      customComment: row.custom_comment,
      allowCustomComments: row.allow_custom_comments
    }));

    return NextResponse.json({
      success: true,
      promotions,
      count: promotions.length
    });

  } catch (error: any) {
    console.error('API Error in GET /api/promotions-with-comments:', error);
    return NextResponse.json({ error: 'Internal server error while fetching promotions with comments.' }, { status: 500 });
  }
}