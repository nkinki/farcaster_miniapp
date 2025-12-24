import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, fid, username, castUrl, rewardPerShare, shareText } = body;

    if (!code || !fid || !username || !castUrl || !rewardPerShare) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Validate Code
    const validCodes = await sql`
      SELECT * FROM daily_codes 
      WHERE code = ${code} AND is_active = TRUE
    `;

    if (validCodes.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 });
    }

    // 2. Check if user already used THIS code
    const existingUsage = await sql`
      SELECT * FROM daily_code_usages 
      WHERE fid = ${fid} AND code = ${code}
    `;

    if (existingUsage.length > 0) {
      return NextResponse.json({ error: 'You have already redeemed this daily code.' }, { status: 400 });
    }

    // 3. Check if user used ANY code today (Optional: enforce 1 code per day regardless of code string)
    // For now, let's stick to "1x lehessen naponta hasznalni" which implies 1 redemption per day.
    // We can check if they have a usage record created today.
    const todayUsage = await sql`
        SELECT * FROM daily_code_usages
        WHERE fid = ${fid} 
        AND used_at > CURRENT_DATE
    `;

    if (todayUsage.length > 0) {
      return NextResponse.json({ error: 'You have already redeemed a code today. Come back tomorrow!' }, { status: 400 });
    }

    // 4. Create Promotion (10k Budget)
    const totalBudget = 10000;
    const blockchainHash = `daily_promo_${Date.now()}_${fid}`; // Placeholder hash

    const promoResult = await sql`
      INSERT INTO promotions (
        fid, username, display_name, cast_url, share_text,
        reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type
      ) VALUES (
        ${fid}, ${username}, ${username}, ${castUrl}, ${shareText || null}, 
        ${rewardPerShare}, ${totalBudget}, ${totalBudget}, 'active', ${blockchainHash}, 'quote'
      )
      RETURNING id
    `;

    const newPromoId = promoResult[0].id;

    // 5. Record Usage
    await sql`
      INSERT INTO daily_code_usages (fid, code)
      VALUES (${fid}, ${code})
    `;

    return NextResponse.json({ success: true, promotionId: newPromoId }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in daily-code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
