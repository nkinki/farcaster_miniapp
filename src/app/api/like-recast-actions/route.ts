import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

// Használj Pool-t a tranzakciókhoz
const pool = new Pool({ connectionString: process.env.NEON_DB_URL! });

export async function POST(request: NextRequest) {
    const client = await pool.connect();
    try {
        const body = await request.json();
        const { promotionId, userFid, actionType } = body;

        // 1. Alapvető validáció
        if (!promotionId || !userFid || !actionType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (!['like', 'recast'].includes(actionType)) {
            return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
        }

        let rewardGranted = false;
        let message = `Action '${actionType}' recorded.`;

        // Adatbázis tranzakció indítása
        await client.query('BEGIN');

        // 2. Részfeladat rögzítése
        await client.query(
            `INSERT INTO like_recast_user_actions (promotion_id, user_fid, action_type)
             VALUES ($1, $2, $3)
             ON CONFLICT (promotion_id, user_fid, action_type) DO NOTHING`,
            [promotionId, userFid, actionType]
        );

        // 3. Teljesítés ellenőrzése
        const { rows: completedActions } = await client.query(
            `SELECT COUNT(*) as count
             FROM like_recast_user_actions
             WHERE promotion_id = $1 AND user_fid = $2`,
            [promotionId, userFid]
        );

        const actionCount = parseInt(completedActions[0].count, 10);

        // 4. HA mindkét feladat kész, JUTALMAZÁS!
        if (actionCount === 2) {
            const { rows: promoRows } = await client.query(
                `SELECT reward_per_share, remaining_budget FROM promotions WHERE id = $1 AND status = 'active'`,
                [promotionId]
            );

            if (promoRows.length > 0) {
                const promotion = promoRows[0];
                const rewardAmount = promotion.reward_per_share;

                if (promotion.remaining_budget >= rewardAmount) {
                    const completionResult = await client.query(
                        `INSERT INTO like_recast_completions (promotion_id, user_fid, reward_amount)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (promotion_id, user_fid) DO NOTHING`,
                        [promotionId, userFid, rewardAmount]
                    );

                    // JAVÍTOTT SOR: Ez a feltétel most már biztonságos
                    if (completionResult.rowCount) { 
                        await client.query(
                            `UPDATE promotions 
                             SET remaining_budget = remaining_budget - $1,
                                 shares_count = shares_count + 1
                             WHERE id = $2`,
                            [rewardAmount, promotionId]
                        );

                        rewardGranted = true;
                        message = 'Congratulations! Both actions completed and reward granted!';
                    } else {
                        message = 'Both actions completed, but reward has already been claimed.';
                    }
                } else {
                    message = 'Both actions completed, but promotion has insufficient budget.';
                }
            }
        }

        // Tranzakció véglegesítése
        await client.query('COMMIT');

        return NextResponse.json({ 
            success: true, 
            rewardGranted, 
            message,
            note: "🚧 Like & Recast functionality is under development"
        }, { status: 200 });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('API Error in POST /api/like-recast-actions:', error);
        return NextResponse.json({ error: 'Failed to submit action' }, { status: 500 });
    } finally {
        client.release();
    }
}