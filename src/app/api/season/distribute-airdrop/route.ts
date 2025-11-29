import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createWalletClient, http, createPublicClient, isAddress, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Treasury wallet setup
if (!process.env.BACKEND_WALLET_PRIVATE_KEY) throw new Error('BACKEND_WALLET_PRIVATE_KEY is not set');
if (!process.env.NEYNAR_API_KEY) throw new Error('NEYNAR_API_KEY is not set');

const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY as `0x${string}`;
const treasuryAccount = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account: treasuryAccount, chain: base, transport: http() });

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const { seasonId, dryRun = false, testMode = false, testAmount, adminPassword } = await request.json();

    // Admin password verification (only for real distributions)
    if (!dryRun && !testMode) {
      const validPassword = process.env.ADMIN_PASSWORD || 'FarcasterAdmin2024!';
      if (adminPassword !== validPassword) {
        console.log('❌ Invalid admin password attempt');
        return NextResponse.json({
          success: false,
          error: 'Invalid admin password'
        }, { status: 401 });
      }
      console.log('✅ Admin password verified');
    }

    if (!seasonId) {
      return NextResponse.json({
        success: false,
        error: 'Season ID is required'
      }, { status: 400 });
    }

    console.log(`🎯 ${dryRun ? 'DRY RUN: ' : ''}${testMode ? 'TEST MODE: ' : ''}Distributing airdrop for Season ${seasonId}`);

    // Get season info
    const seasonResult = await client.query(`
      SELECT id, name, total_rewards, status FROM seasons WHERE id = $1
    `, [seasonId]);

    if (seasonResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Season not found'
      }, { status: 404 });
    }

    const season = seasonResult.rows[0];

    let totalRewardAmount;
    if (testMode && testAmount) {
      totalRewardAmount = testAmount * 1000000000000000000; // Convert to wei
    } else {
      totalRewardAmount = parseInt(season.total_rewards) * 1000000000000000000; // Convert to wei
    }

    // Calculate distribution
    const calculateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/season/calculate-airdrop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId, totalRewardAmount })
    });

    if (!calculateResponse.ok) {
      throw new Error('Failed to calculate airdrop distribution');
    }

    const { distribution } = await calculateResponse.json();

    if (distribution.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to distribute rewards to',
        distributed: []
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const user of distribution) {
      try {
        if (user.reward_amount <= 0) {
          console.log(`⏭️ Skipping user ${user.user_fid} - no reward amount`);
          continue;
        }

        if (dryRun || testMode) {
          const mode = testMode ? 'TEST' : 'DRY RUN';
          console.log(`🧪 ${mode}: Would credit ${user.reward_amount_formatted} to FID: ${user.user_fid}`);
          results.push({
            user_fid: user.user_fid,
            recipient_address: null, // No wallet needed
            reward_amount: user.reward_amount,
            reward_amount_formatted: user.reward_amount_formatted,
            status: testMode ? 'test_simulation' : 'dry_run',
            transaction_hash: null
          });
          continue;
        }

        // Record airdrop claim as PENDING (user must claim manually)
        // Note: reward_amount is stored in CHESS units (not wei) in the database for consistency with other tables
        // user.reward_amount is coming from calculation as CHESS units (number)

        await client.query(`
          INSERT INTO airdrop_claims (
            user_fid, season_id, points_used, reward_amount, 
            status, created_at
          ) VALUES ($1, $2, $3, $4, 'pending', NOW())
          ON CONFLICT (user_fid, season_id) 
          DO UPDATE SET 
            reward_amount = $4,
            points_used = $3,
            status = 'pending'
          WHERE airdrop_claims.status != 'claimed'
        `, [user.user_fid, seasonId, user.points, user.reward_amount]);

        console.log(`✅ Credited ${user.reward_amount_formatted} to FID ${user.user_fid} (Pending Claim)`);

        results.push({
          user_fid: user.user_fid,
          recipient_address: null,
          reward_amount: user.reward_amount,
          reward_amount_formatted: user.reward_amount_formatted,
          status: 'success',
          transaction_hash: null
        });

        successCount++;

      } catch (error: any) {
        console.error(`❌ Failed to credit FID ${user.user_fid}:`, error.message);

        results.push({
          user_fid: user.user_fid,
          recipient_address: null,
          reward_amount: user.reward_amount,
          reward_amount_formatted: user.reward_amount_formatted,
          status: 'error',
          error: error.message,
          transaction_hash: null
        });

        errorCount++;
      }
    }

    // Update season status if not dry run
    if (!dryRun && successCount > 0) {
      await client.query(`
        UPDATE seasons 
        SET status = 'completed', updated_at = NOW() 
        WHERE id = $1
      `, [seasonId]);
    }

    const mode = testMode ? 'test simulation' : (dryRun ? 'simulation' : 'completed');
    console.log(`🎉 Airdrop distribution ${mode}: ${successCount} successful, ${errorCount} failed`);

    return NextResponse.json({
      success: true,
      season_id: seasonId,
      season_name: season.name,
      dry_run: dryRun,
      test_mode: testMode,
      total_users: distribution.length,
      successful_distributions: successCount,
      failed_distributions: errorCount,
      results: results
    });

  } catch (error) {
    console.error('Error distributing airdrop:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to distribute airdrop'
    }, { status: 500 });
  } finally {
    client.release();
  }
}
