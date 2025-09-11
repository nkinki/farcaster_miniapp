import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Adatbázis kapcsolat inicializálása
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Új promóció létrehozása comment funkcionalitással
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fid, username, displayName, castUrl, shareText, 
      rewardPerShare, totalBudget, actionType,
      // Új comment mezők
      commentTemplates, customComment, allowCustomComments
    } = body;

    // Alapvető validáció
    if (!fid || !username || !castUrl || !rewardPerShare || !totalBudget) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Comment validáció
    if (!commentTemplates || !Array.isArray(commentTemplates)) {
      return NextResponse.json({ error: 'commentTemplates must be an array' }, { status: 400 });
    }

    if (commentTemplates.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 comment templates allowed' }, { status: 400 });
    }

    if (customComment && customComment.length > 280) {
      return NextResponse.json({ error: 'Custom comment too long (max 280 characters)' }, { status: 400 });
    }

    // Jelenlegi időpont generálása
    const now = new Date();
    const blockchainHash = `promo_${fid}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Új promóció létrehozása a promotions_with_comments táblában
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
      JSON.stringify(commentTemplates), // Comment templates JSON-ként tárolva
      customComment || null,
      allowCustomComments !== false // Default true
    ]);

    const newPromotion = result.rows[0];

    // Automatikus értesítések trigger (nem blokkoló)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // 1. Email értesítés
    try {
      const notifyResponse = await fetch(`${baseUrl}/api/promotions/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          promotionId: newPromotion.id,
          notificationType: 'new_promotion_with_comments'
        })
      });
      
      if (notifyResponse.ok) {
        console.log(`✅ Email notification sent for promotion with comments ${newPromotion.id}`);
      } else {
        console.warn(`⚠️ Failed to send email notification for promotion with comments ${newPromotion.id}`);
      }
    } catch (notifyError) {
      console.warn('⚠️ Email notification failed (non-blocking):', notifyError);
    }
    
    // 2. Farcaster cast értesítés
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
          hasComments: true, // Új flag a comment funkcionalitáshoz
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
        commentTemplates: JSON.parse(newPromotion.comment_templates || '[]'),
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

// Promóciók lekérése comment funkcionalitással
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
    
    const params = [status];
    
    if (fid) {
      query += ` AND fid = $2`;
      params.push(fid);
    }
    
    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);
    
    // Comment templates JSON parse-olása
    const promotions = result.rows.map(row => ({
      ...row,
      commentTemplates: JSON.parse(row.comment_templates || '[]'),
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
