import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json(
        { error: 'FID parameter is required' },
        { status: 400 }
      );
    }

    const shares = await db.getSharesByUser(parseInt(fid));
    return NextResponse.json({ shares });
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shares' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promotionId, sharerFid, sharerUsername, shareText, rewardAmount } = body;

    // Validate required fields
    if (!promotionId || !sharerFid || !sharerUsername || !rewardAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user can share this promotion (48h limit)
    const canShare = await db.canUserSharePromotion(sharerFid, promotionId, 48);
    if (!canShare) {
      return NextResponse.json(
        { error: 'You can only share this campaign once every 48 hours' },
        { status: 429 }
      );
    }

    // Create share
    const share = await db.createShare({
      promotionId,
      sharerFid,
      sharerUsername,
      shareText,
      rewardAmount
    });

    // Get current promotion to calculate new values
    const currentPromotion = await db.getPromotionById(promotionId);
    if (!currentPromotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    // Update promotion shares count and remaining budget
    await db.updatePromotion(promotionId, {
      sharesCount: currentPromotion.shares_count + 1,
      remainingBudget: currentPromotion.remaining_budget - rewardAmount
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error('Error creating share:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
} 