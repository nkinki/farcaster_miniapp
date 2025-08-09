// FÁJL: /src/app/api/farcaster/cast/route.ts
// Farcaster cast küldése új promotion értesítésekhez

import { NextRequest, NextResponse } from 'next/server';

interface CastRequest {
  text: string;
  embeds?: string[];
  replyTo?: string;
  channelId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CastRequest = await request.json();
    const { text, embeds, replyTo, channelId } = body;
    
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    const signerUuid = process.env.FARCASTER_SIGNER_UUID; // Bot account signer
    
    if (!neynarApiKey) {
      return NextResponse.json({ 
        error: 'Neynar API key not configured' 
      }, { status: 500 });
    }
    
    if (!signerUuid) {
      return NextResponse.json({ 
        error: 'Farcaster signer not configured' 
      }, { status: 500 });
    }
    
    // Neynar API cast endpoint
    const neynarResponse = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api_key': neynarApiKey,
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text: text,
        embeds: embeds || [],
        parent: replyTo,
        channel_id: channelId
      })
    });
    
    if (!neynarResponse.ok) {
      const errorData = await neynarResponse.text();
      console.error('Neynar API Error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to send cast',
        details: errorData
      }, { status: neynarResponse.status });
    }
    
    const castData = await neynarResponse.json();
    
    console.log('✅ Farcaster cast sent successfully:', castData.cast?.hash);
    
    return NextResponse.json({
      success: true,
      cast: castData.cast,
      message: 'Cast sent successfully'
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('❌ Cast API Error:', error);
    return NextResponse.json({
      error: 'Failed to send cast',
      message: error.message
    }, { status: 500 });
  }
}