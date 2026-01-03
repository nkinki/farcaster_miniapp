// FILE: /src/app/api/farcaster/notify-promotion/route.ts
// Sending new promotion Farcaster notification

import { NextRequest, NextResponse } from 'next/server';

interface PromotionNotificationRequest {
  promotionId: string;
  username: string;
  displayName: string;
  totalBudget: number;
  rewardPerShare: number;
  castUrl: string;
  channelId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PromotionNotificationRequest = await request.json();
    const {
      promotionId,
      username,
      displayName,
      totalBudget,
      rewardPerShare,
      castUrl,
      channelId = 'apprank' // Default channel
    } = body;

    // Promotion notification cast text
    const castText = `🚀 NEW PROMOTION ALERT!

👤 @${username} (${displayName}) just created a promotion:

💰 Total Budget: ${totalBudget.toLocaleString()} CHESS
🎁 Reward per Share: ${rewardPerShare.toLocaleString()} CHESS

🔗 Original Cast: ${castUrl}

Share this cast to earn CHESS rewards! 💎

#AppRank #Promotion #CHESS #Farcaster`;

    // Sending cast via the Farcaster API
    const castResponse = await fetch(`${request.nextUrl.origin}/api/farcaster/cast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: castText,
        embeds: [castUrl], // Original cast embed
        channelId: channelId
      })
    });

    if (!castResponse.ok) {
      const errorData = await castResponse.text();
      console.error('Failed to send promotion cast:', errorData);
      return NextResponse.json({
        error: 'Failed to send Farcaster notification',
        details: errorData
      }, { status: 500 });
    }

    const castData = await castResponse.json();

    console.log(`✅ Promotion notification cast sent for promotion ${promotionId}:`, castData.cast?.hash);

    return NextResponse.json({
      success: true,
      message: 'Farcaster promotion notification sent',
      promotion: {
        id: promotionId,
        username,
        totalBudget,
        rewardPerShare
      },
      cast: castData.cast,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Promotion notification error:', error);
    return NextResponse.json({
      error: 'Failed to send promotion notification',
      message: error.message
    }, { status: 500 });
  }
}