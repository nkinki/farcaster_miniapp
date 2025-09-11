import { NextRequest, NextResponse } from 'next/server';
import { FEATURES, getFeatureStatus } from '@/config/features';

export async function GET(request: NextRequest) {
  try {
    const featureStatus = getFeatureStatus();
    
    return NextResponse.json({
      success: true,
      features: featureStatus,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        ENABLE_COMMENTS: process.env.ENABLE_COMMENTS,
        ENABLE_ENHANCED_PROMOTIONS: process.env.ENABLE_ENHANCED_PROMOTIONS,
        ENABLE_COMMENT_ANALYTICS: process.env.ENABLE_COMMENT_ANALYTICS,
        DEBUG_MODE: process.env.DEBUG_MODE,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to get feature status', 
      details: error.message 
    }, { status: 500 });
  }
}
