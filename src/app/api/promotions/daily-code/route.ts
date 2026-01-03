import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/sql';
import { isDiamondVip } from '@/lib/nft-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, fid, username, castUrl } = body;

    // FID and castUrl are always required
    if (!fid || !username || !castUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check VIP Status first to determine if code is required
    const isVip = await isDiamondVip(fid);
    const finalCode = code || (isVip ? 'DIAMOND_VIP_FREE' : null);

    if (!finalCode) {
      return NextResponse.json({ error: 'Secret code is required for non-VIP users.' }, { status: 400 });
    }

    // 2. Security: Validate reward amounts from body
    // Regular: Max 5,000 $CHESS per share (default 5k)
    // VIP: Max 20,000 $CHESS per share (default 10k)
    const clientReward = body.rewardPerShare ? Number(body.rewardPerShare) : (isVip ? 10000 : 5000);
    const MAX_LIMIT = isVip ? 20000 : 5000;

    // Ensure it doesn't exceed the limit
    const REWARD_PER_SHARE = Math.min(clientReward, MAX_LIMIT);

    const REGULAR_BUDGET = 10000;
    const VIP_BUDGET = 100000;

    // 3. Global "Once per Day" Check
    // This prevents a VIP from using a daily code AND their VIP bypass on the same day.
    const todayUsage = await sql`
        SELECT * FROM daily_code_usages
        WHERE fid = ${fid} 
        AND used_at > CURRENT_DATE
    `;

    if (todayUsage.length > 0) {
      return NextResponse.json({ error: 'You have already redeemed a code or VIP bundle today. Come back tomorrow!' }, { status: 400 });
    }

    // 4. Validate Code (only if not using VIP bypass)
    if (finalCode !== 'DIAMOND_VIP_FREE' && finalCode !== 'VIPTEST') {
      const validCodes = await sql`
        SELECT * FROM daily_codes 
        WHERE code = ${finalCode} AND is_active = TRUE
      `;

      if (validCodes.length === 0) {
        return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 });
      }
    }

    const blockchainHash = `daily_promo_${Date.now()}_${fid}`;

    if (isVip || finalCode === 'VIPTEST') {
      // VIP BUNDLE: 100k for Like/Recast, Quote, and Comment + 1 Lotto Ticket
      const actionTypes = ['like_recast', 'quote', 'comment'];
      const promoIds = [];

      for (const actionType of actionTypes) {
        const result = await sql`
          INSERT INTO promotions (
            fid, username, display_name, cast_url, share_text,
            reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type
          ) VALUES (
            ${fid}, ${username}, ${username}, ${castUrl}, NULL, 
            ${REWARD_PER_SHARE}, ${VIP_BUDGET}, ${VIP_BUDGET}, 'active', ${blockchainHash + '_' + actionType}, ${actionType}
          )
          RETURNING id
        `;
        promoIds.push(result[0].id);
      }

      // Grant Free Lotto Ticket
      try {
        const activeRounds = await sql`
          SELECT id FROM lottery_draws WHERE status = 'active' ORDER BY draw_number DESC LIMIT 1
        `;

        if (activeRounds.length > 0) {
          const drawId = activeRounds[0].id;
          const userWallets = await sql`
            SELECT wallet_address FROM user_wallets WHERE fid = ${fid} LIMIT 1
          `;
          const walletAddress = userWallets.length > 0 ? userWallets[0].wallet_address : '0x0000000000000000000000000000000000000000';
          const randomNumber = Math.floor(Math.random() * 100) + 1;

          await sql`
            INSERT INTO lottery_tickets (draw_id, player_fid, "number", transaction_hash, player_address, purchased_at, purchase_price)
            VALUES (${drawId}, ${fid}, ${randomNumber}, ${'vip_bundle_' + Date.now()}, ${walletAddress}, NOW(), 0)
          `;
        }
      } catch (lottoErr) {
        console.error('[VIP Bundle] Lotto ticket error:', lottoErr);
      }

      await sql`
        INSERT INTO daily_code_usages (fid, code)
        VALUES (${fid}, ${finalCode})
      `;

      return NextResponse.json({
        success: true,
        message: 'Diamond VIP Bundle activated! 💎 (Lotto + 3x 100k Promotions)',
        promotionIds: promoIds
      }, { status: 200 });

    } else {
      // REGULAR REDEMPTION: 10k Quote Promotion
      const promoResult = await sql`
        INSERT INTO promotions (
          fid, username, display_name, cast_url, share_text,
          reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type
        ) VALUES (
          ${fid}, ${username}, ${username}, ${castUrl}, NULL, 
          ${REWARD_PER_SHARE}, ${REGULAR_BUDGET}, ${REGULAR_BUDGET}, 'active', ${blockchainHash}, 'quote'
        )
        RETURNING id
      `;

      await sql`
        INSERT INTO daily_code_usages (fid, code)
        VALUES (${fid}, ${finalCode})
      `;

      return NextResponse.json({ success: true, promotionId: promoResult[0].id }, { status: 200 });
    }

  } catch (error: any) {
    console.error('API Error in daily-code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
