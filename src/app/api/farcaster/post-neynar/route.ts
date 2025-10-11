import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, parentUrl, embeds } = await request.json();

    // Neynar API használata cast posztoláshoz
    const neynarResponse = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.NEYNAR_API_KEY || ''
      },
      body: JSON.stringify({
        signer_uuid: process.env.FARCASTER_SIGNER_UUID,
        text: message,
        parent: parentUrl ? { url: parentUrl } : undefined,
        embeds: embeds || []
      })
    });

    if (neynarResponse.ok) {
      const result = await neynarResponse.json();
      console.log('✅ Cast posted via Neynar:', result);
      return NextResponse.json({
        success: true,
        castHash: result.cast?.hash,
        message: 'Cast posted successfully via Neynar'
      });
    } else {
      const error = await neynarResponse.text();
      console.error('❌ Neynar API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to post cast via Neynar' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error posting cast via Neynar:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to post cast via Neynar' },
      { status: 500 }
    );
  }
}
