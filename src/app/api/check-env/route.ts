// Environment változók ellenőrzése
import { NextRequest, NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';

export async function GET(request: NextRequest) {
  try {
    const checks = {
      BACKEND_WALLET_PRIVATE_KEY: {
        exists: !!process.env.BACKEND_WALLET_PRIVATE_KEY,
        valid: false,
        address: null as string | null
      },
      NEON_DB_URL: {
        exists: !!process.env.NEON_DB_URL,
        valid: process.env.NEON_DB_URL !== 'your-neon-connection-string-here'
      },
      NEYNAR_API_KEY: {
        exists: !!process.env.NEYNAR_API_KEY,
        valid: process.env.NEYNAR_API_KEY !== 'your-neynar-api-key-here'
      }
    };

    // BACKEND_WALLET_PRIVATE_KEY validálása
    if (checks.BACKEND_WALLET_PRIVATE_KEY.exists) {
      try {
        const account = privateKeyToAccount(process.env.BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);
        checks.BACKEND_WALLET_PRIVATE_KEY.valid = true;
        checks.BACKEND_WALLET_PRIVATE_KEY.address = account.address;
      } catch (error) {
        checks.BACKEND_WALLET_PRIVATE_KEY.valid = false;
      }
    }

    const allValid = Object.values(checks).every(check => 
      typeof check === 'object' && check.exists && check.valid
    );

    return NextResponse.json({
      success: allValid,
      message: allValid ? 'All environment variables are set correctly' : 'Some environment variables are missing or invalid',
      checks,
      expectedSignerWallet: '0xe156390D3666a5cd996E0b1b070cd52c4fd15787',
      actualSignerWallet: checks.BACKEND_WALLET_PRIVATE_KEY.address,
      signerMatches: checks.BACKEND_WALLET_PRIVATE_KEY.address?.toLowerCase() === '0xe156390D3666a5cd996E0b1b070cd52c4fd15787'.toLowerCase()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Environment check failed',
      details: error.message
    }, { status: 500 });
  }
}