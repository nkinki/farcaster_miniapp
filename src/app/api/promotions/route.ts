// FÁJL: /src/app/api/promotions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { FEATURES } from '@/config/features';

const sql = neon(process.env.DATABASE_URL!);

// Promóciók listázása (ez a rész változatlan)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';

    let promotions;
    if (status === 'all') {
      promotions = await sql`SELECT * FROM promotions ORDER BY created_at DESC`;
    } else {
      promotions = await sql`SELECT * FROM promotions WHERE status = ${status} ORDER BY created_at DESC`;
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
      rewardPerShare, totalBudget, blockchainHash, actionType,
      // Comment functionality (only used if ENABLE_COMMENTS is true)
      commentTemplates, customComment, allowCustomComments
    } = body;

    if (!fid || !username || !castUrl || !rewardPerShare || !totalBudget || !blockchainHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Always insert without comment data for now (backward compatibility)
    // TODO: Add comment columns to promotions table later
    const result = await sql`
      INSERT INTO promotions (
        fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type
      ) VALUES (
        ${fid}, ${username}, ${displayName || null}, ${castUrl}, ${shareText || null}, 
        ${rewardPerShare}, ${totalBudget}, ${totalBudget}, 'active', ${blockchainHash}, ${actionType || 'quote'}
      )
      RETURNING id, cast_url, created_at
    `;
    const newPromotion = result[0];

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