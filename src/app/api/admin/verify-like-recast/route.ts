import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export async function POST(request: NextRequest) {
    const client = await pool.connect();
    try {
        const body = await request.json();
        const { actionId, verified, adminId, notes } = body;

        // Basic validation
        if (!actionId || typeof verified !== 'boolean') {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Start transaction
        await client.query('BEGIN');

        // Get the action details
        const { rows: actionRows } = await client.query(
            `SELECT lrua.*, p.reward_per_share, p.remaining_budget 
             FROM like_recast_user_actions lrua
             JOIN promotions p ON lrua.promotion_id = p.id
             WHERE lrua.id = $1`,
            [actionId]
        );

        if (actionRows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Action not found' }, { status: 404 });
        }

        const action = actionRows[0];

        if (verified) {
            // Update the action as verified
            await client.query(
                `UPDATE like_recast_user_actions 
                 SET verification_method = 'verified', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [actionId]
            );

            // Check if both like and recast are now verified
            const { rows: verifiedActions } = await client.query(
                `SELECT COUNT(*) as count, 
                        COUNT(CASE WHEN verification_method IN ('auto', 'verified') THEN 1 END) as verified_count
                 FROM like_recast_user_actions
                 WHERE promotion_id = $1 AND user_fid = $2`,
                [action.promotion_id, action.user_fid]
            );

            const totalActions = parseInt(verifiedActions[0].count, 10);
            const verifiedCount = parseInt(verifiedActions[0].verified_count, 10);

            console.log(`🔍 Verification check: ${verifiedCount}/${totalActions} actions verified`);

            // If both actions are verified, grant reward
            if (totalActions === 2 && verifiedCount === 2) {
                const rewardAmount = action.reward_per_share;
                console.log(`💰 Granting reward: ${rewardAmount} for user ${action.user_fid}`);

                if (action.remaining_budget >= rewardAmount) {
                    // Record completion
                    await client.query(
                        `INSERT INTO like_recast_completions (promotion_id, user_fid, reward_amount, verification_method)
                         VALUES ($1, $2, $3, 'manual')
                         ON CONFLICT (promotion_id, user_fid) DO NOTHING`,
                        [action.promotion_id, action.user_fid, rewardAmount]
                    );

                    // Update promotion budget
                    await client.query(
                        `UPDATE promotions 
                         SET remaining_budget = remaining_budget - $1,
                             shares_count = shares_count + 1
                         WHERE id = $2`,
                        [rewardAmount, action.promotion_id]
                    );

                    // Update user earnings
                    await client.query(
                        `UPDATE users 
                         SET total_earnings = total_earnings + $1,
                             pending_rewards = pending_rewards + $1,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE fid = $2`,
                        [rewardAmount, action.user_fid]
                    );

                    // Update manual verification status
                    await client.query(
                        `UPDATE manual_verifications 
                         SET status = 'verified', verified_by = $1, verified_at = CURRENT_TIMESTAMP, notes = $2
                         WHERE action_id = $3`,
                        [adminId || 0, notes || 'Manually verified by admin - reward granted', actionId]
                    );

                    await client.query('COMMIT');

                    console.log(`✅ Reward granted successfully: ${rewardAmount} to user ${action.user_fid}`);

                    return NextResponse.json({
                        success: true,
                        message: 'Action verified and reward granted!',
                        rewardGranted: true,
                        rewardAmount
                    });
                } else {
                    await client.query('ROLLBACK');
                    return NextResponse.json({ 
                        error: 'Insufficient budget for reward',
                        remainingBudget: action.remaining_budget,
                        requiredAmount: rewardAmount
                    }, { status: 400 });
                }
            } else {
                // Update manual verification status
                await client.query(
                    `UPDATE manual_verifications 
                     SET status = 'verified', verified_by = $1, verified_at = CURRENT_TIMESTAMP, notes = $2
                     WHERE action_id = $3`,
                    [adminId || 0, notes || 'Manually verified by admin', actionId]
                );

                await client.query('COMMIT');

                return NextResponse.json({
                    success: true,
                    message: 'Action verified. Waiting for second action to complete.',
                    rewardGranted: false,
                    actionsCompleted: verifiedCount,
                    totalRequired: 2
                });
            }
        } else {
            // Reject the action
            await client.query(
                `UPDATE like_recast_user_actions 
                 SET verification_method = 'failed', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [actionId]
            );

            // Update manual verification status
            await client.query(
                `UPDATE manual_verifications 
                 SET status = 'rejected', verified_by = $1, verified_at = CURRENT_TIMESTAMP, notes = $2
                 WHERE action_id = $3`,
                [adminId || 0, notes || 'Rejected by admin', actionId]
            );

            await client.query('COMMIT');

            return NextResponse.json({
                success: true,
                message: 'Action rejected.',
                rewardGranted: false
            });
        }

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Admin verification error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    } finally {
        client.release();
    }
}

// GET endpoint to view pending manual verifications
export async function GET(request: NextRequest) {
    const client = await pool.connect();
    try {
        const { rows: pendingVerifications } = await client.query(
            `SELECT mv.*, 
                    lrua.promotion_id, lrua.user_fid, lrua.action_type, lrua.cast_hash,
                    p.cast_url, p.reward_per_share, p.remaining_budget,
                    u.username as user_username
             FROM manual_verifications mv
             JOIN like_recast_user_actions lrua ON mv.action_id = lrua.id
             JOIN promotions p ON lrua.promotion_id = p.id
             LEFT JOIN users u ON lrua.user_fid = u.fid
             WHERE mv.status = 'pending'
             ORDER BY mv.created_at ASC`
        );

        return NextResponse.json({
            success: true,
            pendingVerifications
        });

    } catch (error: any) {
        console.error('Error fetching pending verifications:', error);
        return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 });
    } finally {
        client.release();
    }
}
