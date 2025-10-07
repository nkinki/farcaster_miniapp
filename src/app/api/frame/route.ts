import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trustedData } = body;
    
    // User authentication ellenőrzés
    interface UserData {
      fid: number;
      username: string;
      displayName: string;
    }
    
    let userData: UserData | null = null;
    if (trustedData?.messageBytes) {
      // Farcaster user adatok kinyerése (mock implementation)
      userData = {
        fid: 1234,
        username: "user",
        displayName: "Farcaster User"
      };
    }
    
    // Return HTML response for frame redirect
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://farc-nu.vercel.app/og-image.png?v=2" />
          <meta property="fc:frame:button:1" content="Open AppRank" />
          <meta property="fc:frame:post_url" content="https://farc-nu.vercel.app/api/frame" />
        </head>
        <body>
          <script>
            window.location.href = "https://farc-nu.vercel.app/";
          </script>
        </body>
      </html>
    `, {
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      },
    });
  } catch (error) {
    console.error('Frame API error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function GET() {
  // Return frame metadata
  return NextResponse.json({
    version: 'next',
    imageUrl: 'https://farc-nu.vercel.app/og-image.png?v=2',
    buttons: [
      {
        label: '🏆 View Rankings',
        action: 'post',
      },
    ],
    postUrl: 'https://farcaster-miniapp-rangsor.vercel.app/api/frame',
  });
}