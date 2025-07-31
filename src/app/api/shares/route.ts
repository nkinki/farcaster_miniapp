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
    console.log('POST /api/shares called');
    
    const body = await request.json();
    console.log('Share request body:', body);
    
    const { promotionId, sharerFid, sharerUsername, shareText, rewardAmount } = body;

    // Validate required fields
    if (!promotionId || !sharerFid || !sharerUsername || !rewardAmount) {
      console.error('Missing required fields:', { promotionId, sharerFid, sharerUsername, rewardAmount });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user can share this promotion (48h limit)
    console.log('Checking share limit for user:', sharerFid, 'promotion:', promotionId);
    const canShare = await db.canUserSharePromotion(sharerFid, promotionId, 48);
    console.log('Can share result:', canShare);
    
    if (!canShare) {
      console.log('Share limit reached for user:', sharerFid, 'promotion:', promotionId);
      return NextResponse.json(
        { error: 'You can only share this campaign once every 48h' },
        { status: 429 }
      );
    }

    // Create share
    console.log('Creating share in database...');
    const share = await db.createShare({
      promotionId,
      sharerFid,
      sharerUsername,
      shareText,
      rewardAmount
    });
    console.log('Share created:', share);

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