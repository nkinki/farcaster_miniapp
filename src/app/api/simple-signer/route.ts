import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Generate a simple UUID for testing
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const signerUuid = generateUUID();
    
    console.log('🔑 Generated Signer UUID:', signerUuid);
    
    return NextResponse.json({
      success: true,
      signerUuid: signerUuid,
      message: 'Generated Signer UUID for testing. Copy this to Vercel FARCASTER_SIGNER_UUID environment variable.',
      instructions: [
        '1. Copy the signerUuid value above',
        '2. Go to Vercel Dashboard → Project → Settings → Environment Variables',
        '3. Add new variable: FARCASTER_SIGNER_UUID = ' + signerUuid,
        '4. Save and redeploy'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error generating signer UUID:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate signer UUID',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
