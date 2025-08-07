import { NextRequest, NextResponse } from 'next/server';

// Mock API to test user stats logic without database
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fid = parseInt(searchParams.get('fid') || '', 10);
    
    if (isNaN(fid)) {
        return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
    }

    // Mock data based on the shares you provided
    const mockShares = [
        { id: 68, promotion_id: 89, sharer_fid: 815252, reward_amount: 5000, reward_claimed: false },
        { id: 69, promotion_id: 89, sharer_fid: 815252, reward_amount: 5000, reward_claimed: false },
        { id: 70, promotion_id: 90, sharer_fid: 815252, reward_amount: 5000, reward_claimed: false }
    ];

    // Filter shares for the requested FID
    const userShares = mockShares.filter(share => share.sharer_fid === fid);
    
    // Calculate stats
    const totalShares = userShares.length;
    const totalEarnings = userShares.reduce((sum, share) => sum + share.reward_amount, 0);
    const pendingRewards = userShares
        .filter(share => !share.reward_claimed)
        .reduce((sum, share) => sum + share.reward_amount, 0);

    return NextResponse.json({
        user: {
            total_shares: totalShares,
            total_earnings: totalEarnings,
            pending_rewards: pendingRewards,
            last_share_date: '2025-08-07T08:07:37.274284Z',
            last_claim_date: null
        },
        campaigns: [],
        recent_activity: userShares.map(share => ({
            cast_url: `https://warpcast.com/~/conversations/${share.promotion_id}`,
            reward_amount: share.reward_amount,
            created_at: '2025-08-07T08:07:37.274284Z'
        })),
        debug: {
            fid: fid,
            mockShares: userShares,
            calculations: {
                totalShares: `${totalShares} shares found`,
                totalEarnings: `${totalEarnings} total earnings (all shares)`,
                pendingRewards: `${pendingRewards} pending rewards (unclaimed only)`
            }
        }
    });
}