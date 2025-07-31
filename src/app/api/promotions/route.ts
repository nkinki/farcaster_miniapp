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
    console.log('POST /api/promotions called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { fid, username, displayName, castUrl, shareText, rewardPerShare, totalBudget } = body;

    // Validate required fields
    if (!fid || !username || !castUrl || !rewardPerShare || !totalBudget) {
      console.error('Missing required fields:', { fid, username, castUrl, rewardPerShare, totalBudget });
      return NextResponse.json(
        { error: `Missing required fields: ${!fid ? 'fid ' : ''}${!username ? 'username ' : ''}${!castUrl ? 'castUrl ' : ''}${!rewardPerShare ? 'rewardPerShare ' : ''}${!totalBudget ? 'totalBudget' : ''}` },
        { status: 400 }
      );
    }

    console.log('Creating user...');
    // Create or update user
    await db.createOrUpdateUser({ fid, username, displayName });

    console.log('Creating promotion...');
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

    console.log('Promotion created successfully:', promotion);
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to create promotion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 