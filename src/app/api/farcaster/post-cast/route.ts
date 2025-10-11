import { NextRequest, NextResponse } from 'next/server';
import { HubRpcClient } from '@farcaster/hub-nodejs';

export async function POST(request: NextRequest) {
  try {
    const { message, parentUrl, embeds } = await request.json();

    // Farcaster Hub kapcsolat
    const hubClient = new HubRpcClient(
      process.env.FARCASTER_HUB_URL || 'https://hub-api.neynar.com/v1',
      {
        'api-key': process.env.NEYNAR_API_KEY
      }
    );

    // Cast létrehozása
    const castData = {
      text: message,
      parentUrl: parentUrl || undefined,
      embeds: embeds || [],
      mentions: [],
      mentionsPositions: []
    };

    // Cast küldése
    const result = await hubClient.submitMessage(castData);

    if (result.isOk()) {
      console.log('✅ Cast posted successfully:', result.value);
      return NextResponse.json({
        success: true,
        castHash: result.value.hash,
        message: 'Cast posted successfully'
      });
    } else {
      console.error('❌ Failed to post cast:', result.error);
      return NextResponse.json(
        { success: false, error: 'Failed to post cast' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error posting cast:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to post cast' },
      { status: 500 }
    );
  }
}
