// Test endpoint with real claim data
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL is not set');
}

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking for users with pending rewards...');

    // Search for users who have pending rewards
    const usersWithRewards = await sql`
      SELECT 
        sharer_fid,
        COALESCE(SUM(reward_amount), 0) as total_earnings,
        COUNT(*) as share_count
      FROM shares 
      GROUP BY sharer_fid
      HAVING COALESCE(SUM(reward_amount), 0) > 0
      ORDER BY total_earnings DESC
      LIMIT 5
    `;

    console.log('Users with rewards:', usersWithRewards);

    if (usersWithRewards.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No users with pending rewards found',
        suggestion: 'Create some test data first'
      });
    }

    // Take the first user
    const testUser = usersWithRewards[0];
    console.log('Testing with user:', testUser);

    // Now try to generate the signature for this user
    const testFid = testUser.sharer_fid;

    // Get the user's data from Neynar (if API key is present)
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'NEYNAR_API_KEY not set',
        testUser: testUser
      });
    }

    try {
      const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${testFid}`, {
        headers: {
          accept: 'application/json',
          api_key: process.env.NEYNAR_API_KEY!
        }
      });

      if (!neynarResponse.ok) {
        throw new Error(`Neynar API error: ${neynarResponse.status}`);
      }

      const neynarData = await neynarResponse.json();
      const recipientAddress = neynarData.users[0]?.verified_addresses?.eth_addresses[0];

      return NextResponse.json({
        success: true,
        message: 'Found test user with rewards',
        testUser: {
          fid: testFid,
          totalEarnings: testUser.total_earnings,
          shareCount: testUser.share_count,
          recipientAddress: recipientAddress || 'No verified address'
        },
        allUsers: usersWithRewards.map(u => ({
          fid: u.sharer_fid,
          earnings: u.total_earnings,
          shares: u.share_count
        }))
      });

    } catch (neynarError: any) {
      return NextResponse.json({
        success: false,
        error: 'Neynar API failed',
        details: neynarError.message,
        testUser: testUser
      });
    }

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database query failed',
      details: error.message
    }, { status: 500 });
  }
}