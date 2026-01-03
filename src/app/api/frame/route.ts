import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trustedData } = body;

    // User authentication check
    interface UserData {
      fid: number;
      username: string;
      displayName: string;
    }

    let userData: UserData | null = null;
    if (trustedData?.messageBytes) {
      // Extract Farcaster user data (mock implementation)
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
          <meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://farc-nu.vercel.app/og-image.png?v=2","button":{"title":"🏆 View Rankings","action":{"type":"launch_miniapp","url":"https://farc-nu.vercel.app/","name":"APPRANK"}}}' />
          <meta name="fc:frame" content='{"version":"1","imageUrl":"https://farc-nu.vercel.app/og-image.png?v=2","button":{"title":"🏆 View Rankings","action":{"type":"launch_frame","url":"https://farc-nu.vercel.app/","name":"APPRANK"}}}' />
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
  // Return miniapp metadata
  return NextResponse.json({
    version: "1",
    imageUrl: "https://farc-nu.vercel.app/og-image.png?v=2",
    button: {
      title: "🏆 View Rankings",
      action: {
        type: "launch_miniapp",
        url: "https://farc-nu.vercel.app/",
        name: "APPRANK"
      }
    }
  });
}