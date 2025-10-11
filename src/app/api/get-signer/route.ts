import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'NEYNAR_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new NeynarAPIClient({
      apiKey: process.env.NEYNAR_API_KEY
    });
    
    // Signer létrehozása
    const signer = await client.createSigner();
    
    console.log('🔑 Created Signer UUID:', signer.signer_uuid);
    
    return NextResponse.json({
      success: true,
      signerUuid: signer.signer_uuid,
      publicKey: signer.public_key,
      status: signer.status,
      message: 'Signer created successfully. Copy the signerUuid to Vercel environment variables.'
    });
    
  } catch (error) {
    console.error('❌ Error creating signer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create signer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
