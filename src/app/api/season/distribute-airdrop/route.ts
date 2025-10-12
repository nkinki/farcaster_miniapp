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
    const { seasonId, dryRun = false } = await request.json();

    if (!seasonId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Season ID is required' 
      }, { status: 400 });
    }

    console.log(`🎯 ${dryRun ? 'DRY RUN: ' : ''}Distributing airdrop for Season ${seasonId}`);

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
    const totalRewardAmount = parseInt(season.total_rewards) * 1000000000000000000; // Convert to wei

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

        // Get user's wallet address
        const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${user.user_fid}`, {
          headers: { accept: 'application/json', api_key: process.env.NEYNAR_API_KEY! }
        });
        
        if (!neynarResponse.ok) {
          throw new Error(`Failed to fetch user data for FID ${user.user_fid}`);
        }
        
        const neynarData = await neynarResponse.json();
        const recipientAddress = neynarData.users[0]?.verified_addresses?.eth_addresses[0];

        if (!recipientAddress || !isAddress(recipientAddress)) {
          throw new Error(`No valid wallet address found for FID ${user.user_fid}`);
        }

        if (dryRun) {
          console.log(`🧪 DRY RUN: Would send ${user.reward_amount_formatted} to ${recipientAddress} (FID: ${user.user_fid})`);
          results.push({
            user_fid: user.user_fid,
            recipient_address: recipientAddress,
            reward_amount: user.reward_amount,
            reward_amount_formatted: user.reward_amount_formatted,
            status: 'dry_run',
            transaction_hash: null
          });
          continue;
        }

        // Send CHESS tokens
        const amountInWei = parseUnits(user.reward_amount.toString(), 18);

        const { request: transferRequest } = await publicClient.simulateContract({
          account: treasuryAccount,
          address: CHESS_TOKEN_ADDRESS,
          abi: CHESS_TOKEN_ABI,
          functionName: 'transfer',
          args: [recipientAddress as `0x${string}`, amountInWei],
        });

        const txHash = await walletClient.writeContract(transferRequest);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        if (receipt.status === 'reverted') {
          throw new Error('Transaction reverted');
        }

        // Record airdrop claim
        await client.query(`
          INSERT INTO airdrop_claims (
            user_fid, season_id, points_used, reward_amount, 
            status, transaction_hash, claimed_at
          ) VALUES ($1, $2, $3, $4, 'claimed', $5, NOW())
        `, [user.user_fid, seasonId, user.points, user.reward_amount, txHash]);

        console.log(`✅ Sent ${user.reward_amount_formatted} to FID ${user.user_fid} (${txHash})`);
        
        results.push({
          user_fid: user.user_fid,
          recipient_address: recipientAddress,
          reward_amount: user.reward_amount,
          reward_amount_formatted: user.reward_amount_formatted,
          status: 'success',
          transaction_hash: txHash
        });

        successCount++;

      } catch (error: any) {
        console.error(`❌ Failed to distribute to FID ${user.user_fid}:`, error.message);
        
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

    console.log(`🎉 Airdrop distribution ${dryRun ? 'simulation' : 'completed'}: ${successCount} successful, ${errorCount} failed`);

    return NextResponse.json({
      success: true,
      season_id: seasonId,
      season_name: season.name,
      dry_run: dryRun,
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
