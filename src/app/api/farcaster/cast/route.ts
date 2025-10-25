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
    
    if (!neynarApiKey || !signerUuid) {
      console.log('🧪 Mock mode: Farcaster credentials not configured');
      console.log('Neynar API Key:', neynarApiKey ? 'Present' : 'Missing');
      console.log('Signer UUID:', signerUuid ? 'Present' : 'Missing');
      
      // Mock response for testing
      return NextResponse.json({
        success: true,
        cast: {
          hash: 'mock-cast-hash-' + Date.now(),
          author: {
            username: 'apprank-bot'
          },
          text: text
        },
        message: 'Mock cast sent successfully (no real Farcaster API)',
        mock: true
      }, { status: 200 });
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
      
      // If signer not found, return mock response instead of error
      if (neynarResponse.status === 404 && errorData.includes('Signer not found')) {
        console.log('🔄 Signer not found, returning mock response');
        return NextResponse.json({
          success: true,
          cast: {
            hash: 'mock-cast-hash-' + Date.now(),
            author: {
              username: 'apprank-bot'
            },
            text: text
          },
          message: 'Mock cast sent successfully (signer not found)',
          mock: true
        }, { status: 200 });
      }
      
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