// FÁJL: /src/app/api/promotions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

// Promóciók listázása (ez a rész változatlan)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';

    let promotions;
    if (status === 'all') {
      const result = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
      promotions = result.rows;
    } else {
      const result = await pool.query('SELECT * FROM promotions WHERE status = $1 ORDER BY created_at DESC', [status]);
      promotions = result.rows;
    }
    
    return NextResponse.json({ promotions }, { status: 200 });
  } catch (error: any) {
    console.error('API Error in GET /api/promotions:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

// Új promóció létrehozása (VÉGLEGES JAVÍTÁS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fid, username, displayName, castUrl, shareText, 
      rewardPerShare, totalBudget, blockchainHash, actionType 
    } = body;

    if (!fid || !username || !castUrl || !rewardPerShare || !totalBudget || !blockchainHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // JAVÍTÁS: Pool query használata Neon helyett
    const result = await pool.query(`
      INSERT INTO promotions (
        fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10
      )
      RETURNING id, cast_url, created_at;
    `, [fid, username, displayName || null, castUrl, shareText || null, rewardPerShare, totalBudget, totalBudget, blockchainHash, actionType || 'quote']);

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
          notificationType: 'new_promotion'
        })
      });
      
      if (notifyResponse.ok) {
        console.log(`✅ Email notification sent for promotion ${newPromotion.id}`);
      } else {
        console.warn(`⚠️ Failed to send email notification for promotion ${newPromotion.id}`);
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
          castUrl: castUrl
        })
      });
      
      if (farcasterResponse.ok) {
        console.log(`✅ Farcaster notification sent for promotion ${newPromotion.id}`);
      } else {
        console.warn(`⚠️ Failed to send Farcaster notification for promotion ${newPromotion.id}`);
      }
    } catch (farcasterError) {
      console.warn('⚠️ Farcaster notification failed (non-blocking):', farcasterError);
    }

    return NextResponse.json({ success: true, promotion: newPromotion }, { status: 201 });

  } catch (error: any) {
    console.error('API Error in POST /api/promotions:', error);
    if (error.code === '23505') { // PostgreSQL unique violation error code
        return NextResponse.json({ error: 'This promotion might already exist.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error while saving promotion.' }, { status: 500 });
  }
}