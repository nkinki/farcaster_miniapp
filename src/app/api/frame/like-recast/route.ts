import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const promoId = searchParams.get('promoId');
  const castHash = searchParams.get('castHash');
  const reward = searchParams.get('reward');

  if (!promoId || !castHash || !reward) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  // Create Farcaster Frame HTML
  const frameHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Like & Recast to Earn ${reward} $CHESS</title>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank/og-image.png" />
  <meta property="fc:frame:button:1" content="👍 Like Cast" />
  <meta property="fc:frame:button:2" content="🔄 Recast Cast" />
  <meta property="fc:frame:button:3" content="💰 Check & Earn ${reward} $CHESS" />
  <meta property="fc:frame:post_url" content="/api/frame/like-recast" />
  <meta property="fc:frame:input:text" content="Enter your FID for verification" />
  <style>
    body { 
      font-family: Arial, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0; 
      padding: 20px; 
      color: white; 
      text-align: center;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: rgba(255,255,255,0.1); 
      padding: 30px; 
      border-radius: 20px; 
      backdrop-filter: blur(10px);
    }
    .title { 
      font-size: 2em; 
      margin-bottom: 20px; 
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .description { 
      font-size: 1.2em; 
      margin-bottom: 30px; 
      line-height: 1.6;
    }
    .steps { 
      text-align: left; 
      background: rgba(255,255,255,0.1); 
      padding: 20px; 
      border-radius: 15px; 
      margin: 20px 0;
    }
    .step { 
      margin: 15px 0; 
      padding: 10px; 
      background: rgba(255,255,255,0.05); 
      border-radius: 10px;
    }
    .reward { 
      font-size: 1.5em; 
      color: #ffd700; 
      font-weight: bold; 
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">🎯 Like & Recast Campaign</div>
    <div class="description">
      Complete the actions below to earn your reward!
    </div>
    
    <div class="steps">
      <div class="step">1️⃣ <strong>Like the Cast:</strong> Click "👍 Like Cast" to like the promotion</div>
      <div class="step">2️⃣ <strong>Recast the Cast:</strong> Click "🔄 Recast Cast" to share it</div>
      <div class="step">3️⃣ <strong>Verify & Earn:</strong> Enter your FID and click "💰 Check & Earn"</div>
    </div>
    
    <div class="reward">
      🎁 Reward: ${reward} $CHESS
    </div>
    
    <div style="margin-top: 30px; font-size: 0.9em; opacity: 0.8;">
      Campaign ID: ${promoId} | Cast: ${castHash}
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(frameHtml, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const buttonIndex = formData.get('buttonIndex');
    const inputText = formData.get('inputText') as string;
    const promoId = formData.get('promoId');
    const castHash = formData.get('castHash');
    const reward = formData.get('reward');

    console.log('Frame POST received:', { buttonIndex, inputText, promoId, castHash, reward });

    if (buttonIndex === '1') {
      // Like button clicked
      return new NextResponse(`
        <html>
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank/like-success.png" />
            <meta property="fc:frame:button:1" content="🔄 Continue to Recast" />
            <meta property="fc:frame:post_url" content="/api/frame/like-recast" />
            <meta property="fc:frame:input:text" content="Enter your FID for verification" />
          </head>
          <body>
            <h1>✅ Like Successful!</h1>
            <p>Now click "Continue to Recast" to complete the campaign.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    if (buttonIndex === '2') {
      // Recast button clicked
      return new NextResponse(`
        <html>
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank/recast-success.png" />
            <meta property="fc:frame:button:1" content="💰 Check & Earn ${reward} $CHESS" />
            <meta property="fc:frame:post_url" content="/api/frame/like-recast" />
            <meta property="fc:frame:input:text" content="Enter your FID for verification" />
          </head>
          <body>
            <h1>✅ Recast Successful!</h1>
            <p>Now click "Check & Earn" to get your reward!</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    if (buttonIndex === '3') {
      // Check & Earn button clicked
      if (!inputText || !promoId || !castHash || !reward) {
        return new NextResponse(`
          <html>
            <head>
              <meta property="fc:frame" content="vNext" />
              <meta property="fc:frame:image" content="https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank/error.png" />
              <meta property="fc:frame:button:1" content="🔄 Try Again" />
              <meta property="fc:frame:post_url" content="/api/frame/like-recast" />
            </head>
            <body>
              <h1>❌ Error</h1>
              <p>Please enter your FID and try again.</p>
            </body>
          </html>
        `, { headers: { 'Content-Type': 'text/html' } });
      }

      // Here you would verify the like/recast actions and credit the reward
      // For now, we'll show a success message
      return new NextResponse(`
        <html>
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank/success.png" />
            <meta property="fc:frame:button:1" content="🎉 Reward Claimed!" />
          </head>
          <body>
            <h1>🎉 Success!</h1>
            <p>You've earned ${reward} $CHESS!</p>
            <p>Your reward will be credited to your account soon.</p>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    // Default response
    return new NextResponse(`
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank/default.png" />
          <meta property="fc:frame:button:1" content="🔄 Start Over" />
          <meta property="fc:frame:post_url" content="/api/frame/like-recast" />
        </head>
        <body>
          <h1>Welcome to Like & Recast Campaign!</h1>
          <p>Click "Start Over" to begin.</p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    console.error('Frame POST error:', error);
    return new NextResponse(`
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank/error.png" />
          <meta property="fc:frame:button:1" content="🔄 Try Again" />
          <meta property="fc:frame:post_url" content="/api/frame/like-recast" />
        </head>
        <body>
          <h1>❌ Error</h1>
          <p>Something went wrong. Please try again.</p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }
}
