import { NextRequest, NextResponse } from 'next/server';
import { performWeatherLottoDraw } from '../../../../scripts/weather-lotto-draw';

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🌤️ Weather Lotto Cron Job Started');
    
    await performWeatherLottoDraw();
    
    console.log('✅ Weather Lotto Cron Job Completed Successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Weather Lotto draw completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Weather Lotto Cron Job Failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Weather Lotto draw failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  try {
    const { force } = await request.json().catch(() => ({}));
    
    if (force) {
      process.env.FORCE_DRAW_NOW = 'true';
    }

    console.log('🌤️ Weather Lotto Manual Draw Started');
    
    await performWeatherLottoDraw();
    
    console.log('✅ Weather Lotto Manual Draw Completed Successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Weather Lotto manual draw completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Weather Lotto Manual Draw Failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Weather Lotto manual draw failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
