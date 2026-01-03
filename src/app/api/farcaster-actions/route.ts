// FILE: /src/app/api/farcaster-actions/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, castHash, userFid } = await request.json();

    console.log(`🎯 Farcaster action: ${action} for cast ${castHash} by user ${userFid}`);

    // Neynar API key (using demo key)
    const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || 'NEYNAR_API_DOCS';

    if (action === 'like') {
      // LIKE ACTION
      try {
        const response = await fetch('https://api.neynar.com/v2/farcaster/reaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key': NEYNAR_API_KEY
          },
          body: JSON.stringify({
            signer_uuid: process.env.FARCASTER_SIGNER_UUID,
            reaction_type: 'like',
            target: castHash,
            target_author_fid: userFid
          })
        });

        if (response.ok) {
          console.log(`👍 Successfully liked cast: ${castHash}`);
          return NextResponse.json({ success: true, action: 'like', castHash });
        } else {
          const error = await response.text();
          console.log(`⚠️ Like failed: ${error}`);
          return NextResponse.json({ success: false, error }, { status: 400 });
        }
      } catch (error) {
        console.log(`⚠️ Like error: ${error}`);
        return NextResponse.json({ success: false, error: 'Like failed' }, { status: 500 });
      }
    }

    if (action === 'recast') {
      // RECAST ACTION
      try {
        const response = await fetch('https://api.neynar.com/v2/farcaster/cast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_key': NEYNAR_API_KEY
          },
          body: JSON.stringify({
            signer_uuid: process.env.FARCASTER_SIGNER_UUID,
            parent: castHash,
            text: '' // Empty text = recast
          })
        });

        if (response.ok) {
          console.log(`🔄 Successfully recasted cast: ${castHash}`);
          return NextResponse.json({ success: true, action: 'recast', castHash });
        } else {
          const error = await response.text();
          console.log(`⚠️ Recast failed: ${error}`);
          return NextResponse.json({ success: false, error }, { status: 400 });
        }
      } catch (error) {
        console.log(`⚠️ Recast error: ${error}`);
        return NextResponse.json({ success: false, error: 'Recast failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Farcaster actions API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}