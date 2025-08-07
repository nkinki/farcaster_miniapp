import { NextRequest, NextResponse } from 'next/server';

// Mock API to test share timers logic without database
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fid = parseInt(searchParams.get('fid') || '', 10);
    
    if (isNaN(fid)) {
        return NextResponse.json({ error: 'Invalid FID' }, { status: 400 });
    }

    // Mock promotions with different timer states
    const mockPromotions = [
        {
            id: 89,
            cast_url: "https://warpcast.com/~/conversations/89",
            status: "active",
            remaining_budget: 50000,
            reward_per_share: 5000,
            // User shared 2 hours ago - still in cooldown
            last_share_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            can_share: false,
            time_remaining_hours: 46 // 48 - 2 = 46 hours remaining
        },
        {
            id: 90,
            cast_url: "https://warpcast.com/~/conversations/90", 
            status: "active",
            remaining_budget: 25000,
            reward_per_share: 5000,
            // User shared 50 hours ago - can share again
            last_share_time: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
            can_share: true,
            time_remaining_hours: 0
        },
        {
            id: 91,
            cast_url: "https://warpcast.com/~/conversations/91",
            status: "active", 
            remaining_budget: 30000,
            reward_per_share: 3000,
            // User never shared this - can share
            last_share_time: null,
            can_share: true,
            time_remaining_hours: 0
        }
    ];

    // Filter only for the requested FID (simulate user-specific data)
    const userTimers = mockPromotions.map(promo => ({
        promotionId: promo.id,
        canShare: promo.can_share,
        timeRemaining: Math.max(0, promo.time_remaining_hours),
        lastShareTime: promo.last_share_time,
        campaignStatus: promo.status,
        remainingBudget: promo.remaining_budget,
        rewardPerShare: promo.reward_per_share,
    }));

    return NextResponse.json({
        success: true,
        timers: userTimers,
        total: userTimers.length,
        debug: {
            fid: fid,
            explanation: {
                promotion89: "Shared 2h ago - 46h cooldown remaining",
                promotion90: "Shared 50h ago - ready to share again", 
                promotion91: "Never shared - ready to share"
            }
        }
    });
}