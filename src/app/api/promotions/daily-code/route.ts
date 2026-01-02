import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/sql';
import { isDiamondVip } from '@/lib/nft-server';

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

    // 4. Handle Redemption
    const isVip = (await isDiamondVip(fid)) || (code === 'VIPTEST');
    const blockchainHash = `daily_promo_${Date.now()}_${fid}`;

    if (isVip) {
      // VIP BUNDLE: 100k for Like/Recast, Quote, and Comment + 1 Lotto Ticket
      const vipBudget = 100000;

      // A. Create 3 Promotions
      const actionTypes = ['like_recast', 'quote', 'comment'];
      const promoIds = [];

      for (const actionType of actionTypes) {
        const result = await sql`
          INSERT INTO promotions (
            fid, username, display_name, cast_url, share_text,
            reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type
          ) VALUES (
            ${fid}, ${username}, ${username}, ${castUrl}, ${shareText || null}, 
            ${rewardPerShare}, ${vipBudget}, ${vipBudget}, 'active', ${blockchainHash + '_' + actionType}, ${actionType}
          )
          RETURNING id
        `;
        promoIds.push(result[0].id);
      }

      // B. Grant Free Lotto Ticket
      try {
        // Find current active round
        const activeRounds = await sql`
          SELECT id FROM lottery_draws WHERE status = 'active' ORDER BY draw_number DESC LIMIT 1
        `;

        if (activeRounds.length > 0) {
          const drawId = activeRounds[0].id;

          // Get user's wallet address
          const userWallets = await sql`
            SELECT wallet_address FROM user_wallets WHERE fid = ${fid} LIMIT 1
          `;
          const walletAddress = userWallets.length > 0 ? userWallets[0].wallet_address : '0x0000000000000000000000000000000000000000';

          const randomNumber = Math.floor(Math.random() * 100) + 1;

          await sql`
            INSERT INTO lottery_tickets (draw_id, player_fid, "number", transaction_hash, player_address, purchased_at, purchase_price)
            VALUES (${drawId}, ${fid}, ${randomNumber}, ${'vip_bundle_' + Date.now()}, ${walletAddress}, NOW(), 0)
          `;
          console.log(`[VIP Bundle] Free ticket issued for FID ${fid} (Round ${drawId}, Number ${randomNumber})`);
        }
      } catch (lottoErr) {
        console.error('[VIP Bundle] Error issuing free ticket:', lottoErr);
        // We don't fail the whole request if lotto fails, but it's not ideal
      }

      // 5. Record Usage
      await sql`
        INSERT INTO daily_code_usages (fid, code)
        VALUES (${fid}, ${code})
      `;

      return NextResponse.json({
        success: true,
        message: 'Diamond VIP Bundle activated! 💎 (Lotto + 3x 100k Promotions)',
        promotionIds: promoIds
      }, { status: 200 });

    } else {
      // REGULAR REDEMPTION: 10k Quote Promotion
      const regularBudget = 10000;
      const promoResult = await sql`
        INSERT INTO promotions (
          fid, username, display_name, cast_url, share_text,
          reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type
        ) VALUES (
          ${fid}, ${username}, ${username}, ${castUrl}, ${shareText || null}, 
          ${rewardPerShare}, ${regularBudget}, ${regularBudget}, 'active', ${blockchainHash}, 'quote'
        )
        RETURNING id
      `;

      // 5. Record Usage
      await sql`
        INSERT INTO daily_code_usages (fid, code)
        VALUES (${fid}, ${code})
      `;

      return NextResponse.json({ success: true, promotionId: promoResult[0].id }, { status: 200 });
    }

  } catch (error: any) {
    console.error('API Error in daily-code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
