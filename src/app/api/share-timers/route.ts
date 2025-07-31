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

    // Get all active promotions
    const promotions = await db.getAllActivePromotions();
    
    // Check share timers for each promotion
    const timers = await Promise.all(
      promotions.map(async (promotion) => {
        const shareCheck = await db.canUserSharePromotion(parseInt(fid), promotion.id, 48);
        return {
          promotionId: promotion.id,
          canShare: shareCheck.canShare,
          timeRemaining: shareCheck.timeRemaining
        };
      })
    );

    return NextResponse.json({ timers });
  } catch (error) {
    console.error('Error fetching share timers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share timers' },
      { status: 500 }
    );
  }
} 