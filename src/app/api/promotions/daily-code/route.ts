import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isDiamondVip } from '@/lib/nft-server';

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const { code, fid, username, castUrl } = body;

    // FID and castUrl are always required
    if (!fid || !username || !castUrl) {
      console.warn('[daily-code] Missing required fields:', { fid, username, castUrl });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check VIP Status first to determine if code is required
    const vipResult = await isDiamondVip(fid);
    const isVip = vipResult.isVip;
    const finalCode = code || (isVip ? 'DIAMOND_VIP_FREE' : null);

    if (!finalCode) {
      console.warn(`[daily-code] Secret code missing for non-VIP user FID: ${fid}`, vipResult.debugInfo);
      return NextResponse.json({
        error: 'Secret code is required for non-VIP users.',
        debug: vipResult.debugInfo
      }, { status: 400 });
    }

    // 2. Security: Validate reward amounts from body
    const clientReward = body.rewardPerShare ? Number(body.rewardPerShare) : (isVip ? 10000 : 5000);
    const MAX_LIMIT = isVip ? 20000 : 5000;
    const REWARD_PER_SHARE = Math.min(clientReward, MAX_LIMIT);

    const REGULAR_BUDGET = 10000;
    const VIP_BUDGET = 100000;

    // 3. Connect to DB and start transaction
    client = await pool.connect();
    await client.query('BEGIN');

    // 4. Global "Once per Day" Check
    const todayUsage = await client.query(`
        SELECT * FROM daily_code_usages
        WHERE fid = $1 
        AND used_at > CURRENT_DATE
    `, [fid]);

    if (todayUsage.rows.length > 0) {
      await client.query('ROLLBACK');
      console.warn(`[daily-code] FID ${fid} already redeemed today`);
      return NextResponse.json({ error: 'You have already redeemed a code or VIP bundle today. Come back tomorrow!' }, { status: 400 });
    }

    // 5. Validate Code (only if not using VIP bypass)
    if (finalCode !== 'DIAMOND_VIP_FREE' && finalCode !== 'VIPTEST') {
      const validCodes = await client.query(`
        SELECT * FROM daily_codes 
        WHERE code = $1 AND is_active = TRUE
      `, [finalCode]);

      if (validCodes.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn(`[daily-code] Invalid code attempted by FID ${fid}: ${finalCode}`);
        return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 });
      }
    }

    const blockchainHash = `daily_promo_${Date.now()}_${fid}`;

    if (isVip || finalCode === 'VIPTEST') {
      // VIP BUNDLE: 100k for Like/Recast, Quote, and Comment + 1 Lotto Ticket
      const actionTypes = ['like_recast', 'quote', 'comment'];
      const promoIds = [];

      for (const actionType of actionTypes) {
        const result = await client.query(`
          INSERT INTO promotions (
            fid, username, display_name, cast_url, share_text,
            reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type, owner_fid
          ) VALUES (
            $1, $2, $3, $4, NULL, 
            $5, $6, $7, 'active', $8, $9, $10
          )
          RETURNING id
        `, [fid, username, username, castUrl, REWARD_PER_SHARE, VIP_BUDGET, VIP_BUDGET, blockchainHash + '_' + actionType, actionType, fid]);

        promoIds.push(result.rows[0].id);
      }

      // Grant Free Lotto Ticket
      try {
        const activeRounds = await client.query(`
          SELECT id FROM lottery_draws WHERE status = 'active' ORDER BY draw_number DESC LIMIT 1
        `);

        if (activeRounds.rows.length > 0) {
          const drawId = activeRounds.rows[0].id;
          const userWallets = await client.query(`
            SELECT wallet_address FROM user_wallets WHERE fid = $1 LIMIT 1
          `, [fid]);
          const walletAddress = userWallets.rows.length > 0 ? userWallets.rows[0].wallet_address : '0x0000000000000000000000000000000000000000';
          const randomNumber = Math.floor(Math.random() * 100) + 1;

          await client.query(`
            INSERT INTO lottery_tickets (draw_id, player_fid, "number", transaction_hash, player_address, purchased_at, purchase_price)
            VALUES ($1, $2, $3, $4, $5, NOW(), 0)
          `, [drawId, fid, randomNumber, 'vip_bundle_' + Date.now(), walletAddress]);
        }
      } catch (lottoErr) {
        console.error('[VIP Bundle] Lotto ticket error:', lottoErr);
        // We don't necessarily want to rollback the whole thing if just lotto fails, 
        // but for now, let's keep it consistent.
      }

      await client.query(`
        INSERT INTO daily_code_usages (fid, code)
        VALUES ($1, $2)
      `, [fid, finalCode]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Diamond VIP Bundle activated! 💎 (Lotto + 3x 100k Promotions)',
        promotionIds: promoIds
      }, { status: 200 });

    } else {
      // REGULAR REDEMPTION: 10k Quote Promotion
      const promoResult = await client.query(`
        INSERT INTO promotions (
          fid, username, display_name, cast_url, share_text,
          reward_per_share, total_budget, remaining_budget, status, blockchain_hash, action_type, owner_fid
        ) VALUES (
          $1, $2, $3, $4, NULL, 
          $5, $6, $7, 'active', $8, 'quote', $9
        )
        RETURNING id
      `, [fid, username, username, castUrl, REWARD_PER_SHARE, REGULAR_BUDGET, REGULAR_BUDGET, blockchainHash, fid]);

      await client.query(`
        INSERT INTO daily_code_usages (fid, code)
        VALUES ($1, $2)
      `, [fid, finalCode]);

      await client.query('COMMIT');

      return NextResponse.json({ success: true, promotionId: promoResult.rows[0].id }, { status: 200 });
    }

  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('API Error in daily-code:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
