import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle frame interaction
    return NextResponse.json({
      success: true,
      message: 'Frame interaction received',
      data: body
    });
  } catch (error) {
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
    imageUrl: 'https://farcaster-miniapp-rangsor.vercel.app/og-image.png',
    buttons: [
      {
        label: '🏆 Nézd meg a toplistát',
        action: 'post',
      },
    ],
    postUrl: 'https://farcaster-miniapp-rangsor.vercel.app/api/frame',
  });
} 