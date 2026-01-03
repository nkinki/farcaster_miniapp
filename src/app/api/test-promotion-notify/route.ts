// TEST API - Testing the promotion notification system
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing promotion notification system...');

    // Mock promotion data
    const mockPromotions = [
      {
        id: 'test-1',
        fid: 12345,
        username: 'testuser',
        display_name: 'Test User',
        cast_url: 'https://warpcast.com/testuser/0x12345',
        share_text: 'Test promotion share text',
        reward_per_share: 10,
        total_budget: 1000,
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 'test-2',
        fid: 67890,
        username: 'anotheruser',
        display_name: 'Another User',
        cast_url: 'https://warpcast.com/anotheruser/0x67890',
        share_text: 'Another test promotion',
        reward_per_share: 5,
        total_budget: 500,
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];

    console.log(`📊 Mock data: ${mockPromotions.length} promotions`);

    return NextResponse.json({
      success: true,
      message: 'Promotion notification test endpoint',
      count: mockPromotions.length,
      promotions: mockPromotions,
      timestamp: new Date().toISOString(),
      test: true
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Test API Error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 Testing POST notification trigger:', body);

    return NextResponse.json({
      success: true,
      message: 'Test notification triggered',
      received: body,
      timestamp: new Date().toISOString(),
      test: true
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Test POST Error:', error);
    return NextResponse.json({
      error: 'Test POST failed',
      message: error.message
    }, { status: 500 });
  }
}