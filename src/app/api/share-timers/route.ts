import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fid = parseInt(searchParams.get('fid') || '', 10);

    if (isNaN(fid)) {
        return NextResponse.json({ error: 'Invalid or missing FID' }, { status: 400 });
    }

    try {
        const promotionsWithTimers = await sql`
            SELECT 
                p.id,
                p.cast_url,
                p.status,
                p.remaining_budget,
                p.reward_per_share,
                p.action_type,
                s.last_share_time,
                CASE 
                    WHEN s.last_share_time IS NULL THEN true
                    WHEN p.action_type = 'like_recast' THEN false  -- Like/recast can only be done once
                    WHEN p.action_type = 'comment' AND s.last_share_time < NOW() - INTERVAL '48 hours' THEN true  -- Comment: 48h cooldown
                    WHEN p.action_type = 'comment' THEN false  -- Comment: still in 48h cooldown
                    WHEN s.last_share_time < NOW() - INTERVAL '48 hours' THEN true  -- Quote: 48h cooldown
                    ELSE false 
                END as can_share,
                CASE
                    WHEN s.last_share_time IS NULL THEN 0
                    WHEN p.action_type = 'like_recast' THEN 0  -- Like/recast: no countdown
                    WHEN p.action_type = 'comment' AND s.last_share_time < NOW() - INTERVAL '48 hours' THEN 0  -- Comment: cooldown finished
                    WHEN p.action_type = 'comment' THEN EXTRACT(EPOCH FROM (s.last_share_time + INTERVAL '48 hours' - NOW())) / 3600  -- Comment: show countdown
                    WHEN s.last_share_time < NOW() - INTERVAL '48 hours' THEN 0  -- Quote: cooldown finished
                    ELSE EXTRACT(EPOCH FROM (s.last_share_time + INTERVAL '48 hours' - NOW())) / 3600  -- Quote: show countdown
                END as time_remaining_hours
            FROM promotions p
            LEFT JOIN (
                SELECT 
                    promotion_id,
                    sharer_fid,
                    MAX(created_at) as last_share_time
                FROM (
                    SELECT promotion_id, sharer_fid, created_at FROM shares WHERE sharer_fid = ${fid}
                    UNION ALL
                    SELECT promotion_id, user_fid as sharer_fid, created_at FROM pending_comments WHERE user_fid = ${fid} AND status = 'pending'
                ) combined_actions
                GROUP BY promotion_id, sharer_fid
            ) s ON p.id = s.promotion_id
            WHERE p.status = 'active'
            AND p.remaining_budget >= p.reward_per_share
            ORDER BY p.reward_per_share DESC
        `;

        const timers = promotionsWithTimers.map((row: any) => ({
            promotionId: row.id,
            canShare: row.can_share,
            timeRemaining: Math.max(0, row.time_remaining_hours),
            lastShareTime: row.last_share_time,
            campaignStatus: row.status,
            remainingBudget: row.remaining_budget,
            rewardPerShare: row.reward_per_share,
        }));

        return NextResponse.json({
            success: true,
            timers: timers,
            total: timers.length,
        });
    } catch (error: any) {
        console.error('API Error in /api/share-timers:', error.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}