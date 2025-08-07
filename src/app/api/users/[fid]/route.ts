import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
    // Extract `fid` from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const fidString = pathSegments[pathSegments.length - 1]; // Get the last segment, which is the fid
    const fid = parseInt(fidString, 10);
    
    if (isNaN(fid)) {
        return NextResponse.json({ error: 'Invalid FID in URL' }, { status: 400 });
    }

    try {
        // Enhanced query to get comprehensive user statistics
        const [userStatsResult, campaignStatsResult, recentActivityResult] = await Promise.all([
            // Basic user statistics - separate total earnings from pending rewards
            sql`
                SELECT
                    COUNT(DISTINCT s.id) AS total_shares,
                    COALESCE(SUM(s.reward_amount), 0) AS total_earnings,
                    COALESCE(SUM(CASE WHEN s.reward_claimed = FALSE THEN s.reward_amount ELSE 0 END), 0) AS pending_rewards,
                    MAX(s.created_at) AS last_share_date,
                    MAX(s.claimed_at) AS last_claim_date
                FROM shares s
                WHERE s.sharer_fid = ${fid};
            `,
            // Campaigns created by the user
            sql`
                SELECT 
                    id, 
                    cast_url, 
                    status, 
                    total_budget,
                    remaining_budget,
                    reward_per_share
                FROM promotions
                WHERE creator_fid = ${fid}
                ORDER BY created_at DESC;
            `,
            // Recent share activity for the user
            sql`
                SELECT 
                    p.cast_url, 
                    s.reward_amount, 
                    s.created_at
                FROM shares s
                JOIN promotions p ON s.promotion_id = p.id
                WHERE s.sharer_fid = ${fid}
                ORDER BY s.created_at DESC
                LIMIT 5;
            `
        ]);

        const userStats = userStatsResult[0] || { total_shares: 0, total_earnings: 0, pending_rewards: 0, last_share_date: null, last_claim_date: null };
        
        return NextResponse.json({
            user: {
                total_shares: Number(userStats.total_shares),
                total_earnings: Number(userStats.total_earnings),
                pending_rewards: Number(userStats.pending_rewards),
                last_share_date: userStats.last_share_date,
                last_claim_date: userStats.last_claim_date
            },
            campaigns: campaignStatsResult,
            recent_activity: recentActivityResult
        });

    } catch (error: any) {
        console.error(`API Error in GET /api/users/${fid}:`, error.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}