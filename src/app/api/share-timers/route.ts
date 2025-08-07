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
                GREATEST(
                    COALESCE(s.last_unclaimed_share, '1970-01-01'::timestamp),
                    COALESCE(c.last_claimed_share, '1970-01-01'::timestamp)
                ) as last_share_time,
                CASE 
                    WHEN GREATEST(
                        COALESCE(s.last_unclaimed_share, '1970-01-01'::timestamp),
                        COALESCE(c.last_claimed_share, '1970-01-01'::timestamp)
                    ) = '1970-01-01'::timestamp THEN true
                    WHEN GREATEST(
                        COALESCE(s.last_unclaimed_share, '1970-01-01'::timestamp),
                        COALESCE(c.last_claimed_share, '1970-01-01'::timestamp)
                    ) < NOW() - INTERVAL '48 hours' THEN true
                    ELSE false 
                END as can_share,
                CASE
                    WHEN GREATEST(
                        COALESCE(s.last_unclaimed_share, '1970-01-01'::timestamp),
                        COALESCE(c.last_claimed_share, '1970-01-01'::timestamp)
                    ) = '1970-01-01'::timestamp THEN 0
                    WHEN GREATEST(
                        COALESCE(s.last_unclaimed_share, '1970-01-01'::timestamp),
                        COALESCE(c.last_claimed_share, '1970-01-01'::timestamp)
                    ) < NOW() - INTERVAL '48 hours' THEN 0
                    ELSE EXTRACT(EPOCH FROM (GREATEST(
                        COALESCE(s.last_unclaimed_share, '1970-01-01'::timestamp),
                        COALESCE(c.last_claimed_share, '1970-01-01'::timestamp)
                    ) + INTERVAL '48 hours' - NOW())) / 3600
                END as time_remaining_hours
            FROM promotions p
            LEFT JOIN (
                SELECT 
                    promotion_id,
                    sharer_fid,
                    MAX(created_at) as last_unclaimed_share
                FROM shares
                WHERE sharer_fid = ${fid}
                GROUP BY promotion_id, sharer_fid
            ) s ON p.id = s.promotion_id
            LEFT JOIN (
                SELECT 
                    (jsonb_array_elements(claimed_shares)->>'promotion_id')::integer as promotion_id,
                    MAX((jsonb_array_elements(claimed_shares)->>'created_at')::timestamp) as last_claimed_share
                FROM claims
                WHERE user_fid = ${fid}
                GROUP BY (jsonb_array_elements(claimed_shares)->>'promotion_id')::integer
            ) c ON p.id = c.promotion_id
            WHERE p.status = 'active'
            AND p.remaining_budget >= p.reward_per_share
            ORDER BY p.reward_per_share DESC
        `;

        const timers = promotionsWithTimers.map((row: any) => ({
            promotionId: row.id,
            canShare: row.can_share,
            timeRemaining: Math.max(0, row.time_remaining_hours),
            lastShareTime: row.last_share_time === '1970-01-01T00:00:00.000Z' ? null : row.last_share_time,
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