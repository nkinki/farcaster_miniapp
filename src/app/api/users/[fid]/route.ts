import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const fidString = pathSegments[pathSegments.length - 1];
    const fid = parseInt(fidString, 10);
    
    if (isNaN(fid)) {
        return NextResponse.json({ error: 'Invalid FID in URL' }, { status: 400 });
    }

    try {
        console.log(`Fetching user stats for FID: ${fid}`);
        
        // Get user stats from shares table (same as quote system)
        const [userStatsResult] = await sql`
            SELECT
                COUNT(id) AS total_shares,
                COALESCE(SUM(reward_amount), 0) AS total_earnings,
                COALESCE(SUM(CASE WHEN reward_claimed = FALSE THEN reward_amount ELSE 0 END), 0) AS pending_rewards
            FROM shares
            WHERE sharer_fid = ${fid};
        `;
        
        // Get follow actions stats
        const [followStatsResult] = await sql`
            SELECT
                COUNT(id) AS total_follows,
                COALESCE(SUM(reward_amount), 0) AS follow_earnings,
                COALESCE(SUM(CASE WHEN status = 'verified' AND reward_claimed = FALSE THEN reward_amount ELSE 0 END), 0) AS follow_pending_rewards
            FROM follow_actions
            WHERE user_fid = ${fid} AND status = 'verified';
        `;
        
        // Get airdrop claims pending rewards (reward_amount is in milliCHESS, convert to CHESS by dividing by 10^15)
        const [airdropResult] = await sql`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END), 0) AS airdrop_pending
            FROM airdrop_claims
            WHERE user_fid = ${fid};
        `;
        
        const userStats = userStatsResult || { total_shares: 0, total_earnings: 0, pending_rewards: 0 };
        const followStats = followStatsResult || { total_follows: 0, follow_earnings: 0, follow_pending_rewards: 0 };
        const airdropStats = airdropResult || { airdrop_pending: 0 };
        
        // Combine stats from all tables
        // Note: airdrop_pending is in wei (from airdrop_claims), convert to CHESS by dividing by 10^18
        const airdropPendingInCHESS = Number(airdropStats.airdrop_pending) / 1000000000000000000;
        
        const totalShares = Number(userStats.total_shares) + Number(followStats.total_follows);
        const totalEarnings = Number(userStats.total_earnings) + Number(followStats.follow_earnings);
        const totalPendingRewards = Number(userStats.pending_rewards) + Number(followStats.follow_pending_rewards) + airdropPendingInCHESS;
        
        return NextResponse.json({
            user: {
                total_shares: totalShares,
                total_earnings: totalEarnings,
                pending_rewards: totalPendingRewards,
                // Breakdown for debugging
                shares_stats: {
                    total_shares: Number(userStats.total_shares),
                    total_earnings: Number(userStats.total_earnings),
                    pending_rewards: Number(userStats.pending_rewards)
                },
                follow_stats: {
                    total_follows: Number(followStats.total_follows),
                    follow_earnings: Number(followStats.follow_earnings),
                    follow_pending_rewards: Number(followStats.follow_pending_rewards)
                }
            }
        });

    } catch (error: any) {
        console.error(`API Error in GET /api/users/${fid}:`, error.message);
        
        // Ha a reward_claimed oszlop nem létezik, adjunk vissza egy alap állapotot
        if (error.message.includes('column "reward_claimed" does not exist')) {
            try {
                const [fallbackStats] = await sql`
                    SELECT COUNT(id) AS total_shares, COALESCE(SUM(reward_amount), 0) AS pending_rewards
                    FROM shares WHERE sharer_fid = ${fid};
                `;
                return NextResponse.json({
                    user: {
                        total_shares: Number(fallbackStats.total_shares),
                        total_earnings: Number(fallbackStats.pending_rewards),
                        pending_rewards: Number(fallbackStats.pending_rewards),
                    }
                });
            } catch (fallbackError) {
                console.error('Fallback query also failed:', fallbackError);
            }
        }
        
        return NextResponse.json({
            user: {
                total_shares: 0,
                total_earnings: 0,
                pending_rewards: 0,
            }
        });
    }
}