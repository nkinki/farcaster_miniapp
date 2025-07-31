import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (fid) {
      // Get promotions by specific user
      const promotions = await db.getPromotionsByUser(parseInt(fid));
      return NextResponse.json({ promotions });
    } else {
      // Get all active promotions
      const promotions = await db.getAllActivePromotions();
      return NextResponse.json({ promotions });
    }
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, username, displayName, castUrl, shareText, rewardPerShare, totalBudget } = body;

    // Validate required fields
    if (!fid || !username || !castUrl || !rewardPerShare || !totalBudget) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create or update user
    await db.createOrUpdateUser({ fid, username, displayName });

    // Create promotion
    const promotion = await db.createPromotion({
      fid,
      username,
      displayName,
      castUrl,
      shareText,
      rewardPerShare,
      totalBudget
    });

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { error: 'Failed to create promotion' },
      { status: 500 }
    );
  }
} 