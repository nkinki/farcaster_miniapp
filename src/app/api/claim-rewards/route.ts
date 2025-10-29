// FÁJL: /src/app/api/claim-rewards/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createWalletClient, http, createPublicClient, isAddress, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';

// Dummy database connection for build (replace with real connection in production)
if (!process.env.BACKEND_WALLET_PRIVATE_KEY) throw new Error('BACKEND_WALLET_PRIVATE_KEY is not set');
if (!process.env.NEYNAR_API_KEY) throw new Error('NEYNAR_API_KEY is not set');

const sql = neon(process.env.NEON_DB_URL || 'postgresql://user:password@localhost:5432/dummy?sslmode=disable');
const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY as `0x${string}`;
const treasuryAccount = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account: treasuryAccount, chain: base, transport: http() });

async function setupDatabase() {
    // Create claims table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS claims (
        id SERIAL PRIMARY KEY,
        user_fid INTEGER NOT NULL,
        amount DECIMAL(18, 2) NOT NULL,
        shares_count INTEGER NOT NULL,
        recipient_address VARCHAR(42) NOT NULL,
        tx_hash VARCHAR(66) NOT NULL,
        claimed_shares_ids INTEGER[] NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create lottery_winnings table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS lottery_winnings (
        id SERIAL PRIMARY KEY,
        player_fid INTEGER NOT NULL,
        draw_id INTEGER NOT NULL,
        ticket_id INTEGER NOT NULL,
        amount_won BIGINT NOT NULL,
        claimed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Add reward_claimed column to shares table if it doesn't exist
    try {
        await sql`ALTER TABLE shares ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT FALSE`;
    } catch (e) {
        console.log('reward_claimed column might already exist, continuing...');
    }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fid, winningId } = body;

  if (!fid) {
    return NextResponse.json({ error: 'FID is required' }, { status: 400 });
  }

  try {
    await setupDatabase();

    // If winningId is provided, claim specific lottery winning
    if (winningId) {
      const lotteryWinning = await sql`
        SELECT id, player_fid, amount_won, claimed_at
        FROM lottery_winnings 
        WHERE id = ${winningId} AND player_fid = ${fid} AND claimed_at IS NULL
      `;

      if (lotteryWinning.length === 0) {
        throw new Error('No lottery winning found or already claimed.');
      }

      const winning = lotteryWinning[0];
      const amountToClaim = Number(winning.amount_won);

      // Check if amount is valid
      if (amountToClaim <= 0) {
        throw new Error(`Invalid winning amount: ${amountToClaim}. Please contact support.`);
      }

      console.log(`Claiming lottery winning: FID ${fid}, Amount: ${amountToClaim} CHESS`);

      // Get user's wallet address
      const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
        headers: { accept: 'application/json', api_key: process.env.NEYNAR_API_KEY! }
      });
      if (!neynarResponse.ok) throw new Error('Failed to fetch user data from Neynar.');
      
      const neynarData = await neynarResponse.json();
      const recipientAddress = neynarData.users[0]?.verified_addresses?.eth_addresses[0];

      if (!recipientAddress || !isAddress(recipientAddress)) {
        throw new Error(`Could not find a valid wallet for FID ${fid}.`);
      }

      console.log(`Sending lottery winning ${amountToClaim} CHESS to ${recipientAddress} for FID ${fid}`);
      const amountInWei = parseUnits(amountToClaim.toString(), 18);

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
        throw new Error('On-chain transfer transaction failed.');
      }

      // Mark lottery winning as claimed
      await sql`
        UPDATE lottery_winnings 
        SET claimed_at = NOW()
        WHERE id = ${winningId}
      `;

      return NextResponse.json({ 
        success: true, 
        transactionHash: txHash,
        claimedAmount: amountToClaim,
        type: 'lottery_winning'
      }, { status: 200 });
    }

    // Get unclaimed shares
    const userShares = await sql`
        SELECT id, reward_amount, 'shares' as source_table
        FROM shares 
        WHERE sharer_fid = ${fid} AND reward_claimed = FALSE
    `;

    // Get unclaimed follow actions
    const userFollows = await sql`
        SELECT id, reward_amount, 'follow_actions' as source_table
        FROM follow_actions 
        WHERE user_fid = ${fid} AND status = 'verified' AND reward_claimed = FALSE
    `;

    // Get unclaimed airdrop claims (stored in CHESS DECIMAL)
    const userAirdrops = await sql`
        SELECT id, reward_amount
        FROM airdrop_claims
        WHERE user_fid = ${fid} AND status = 'pending'
    `;

    // Combine all unclaimed rewards (shares + follows), keep count for history
    const allUnclaimedRewards = [...userShares, ...userFollows];

    if (allUnclaimedRewards.length === 0) {
      throw new Error('No rewards to claim.');
    }

    const baseAmount = allUnclaimedRewards.reduce((sum, reward) => sum + Number(reward.reward_amount), 0);
    const airdropAmount = userAirdrops.reduce((sum: number, a: any) => sum + Number(a.reward_amount), 0);
    const amountToClaim = baseAmount + airdropAmount;
    const rewardsCount = allUnclaimedRewards.length + userAirdrops.length;
    const shareIds = userShares.map(s => s.id);
    const followIds = userFollows.map(f => f.id);
    const airdropIds = userAirdrops.map((a: any) => a.id);
    
    if (!amountToClaim || amountToClaim <= 0) {
      throw new Error('No rewards to claim.');
    }

    // Check minimum claim amount (10,000 CHESS)
    const MIN_CLAIM_AMOUNT = 10000;
    if (amountToClaim < MIN_CLAIM_AMOUNT) {
      throw new Error(`Minimum claim amount is ${MIN_CLAIM_AMOUNT} CHESS. You have ${amountToClaim.toFixed(2)} CHESS pending.`);
    }

    const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
        headers: { accept: 'application/json', api_key: process.env.NEYNAR_API_KEY! }
    });
    if (!neynarResponse.ok) throw new Error('Failed to fetch user data from Neynar.');
    
    const neynarData = await neynarResponse.json();
    const recipientAddress = neynarData.users[0]?.verified_addresses?.eth_addresses[0];

    if (!recipientAddress || !isAddress(recipientAddress)) {
      throw new Error(`Could not find a valid wallet for FID ${fid}.`);
    }

    console.log(`Sending ${amountToClaim} CHESS to ${recipientAddress} for FID ${fid}`);
    const amountInWei = parseUnits(amountToClaim.toString(), 18);

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
        throw new Error('On-chain transfer transaction failed.');
    }

    // Mark shares as claimed
    if (shareIds.length > 0) {
      await sql`
        UPDATE shares 
        SET reward_claimed = TRUE
        WHERE id = ANY(${shareIds})
      `;
    }
    
    // Mark follow actions as claimed
    if (followIds.length > 0) {
      await sql`
        UPDATE follow_actions 
        SET reward_claimed = TRUE
        WHERE id = ANY(${followIds})
      `;
    }
    
    // Mark airdrops as claimed
    if (airdropIds.length > 0) {
      await sql`
        UPDATE airdrop_claims
        SET status = 'claimed', claimed_at = NOW(), transaction_hash = ${txHash}
        WHERE id = ANY(${airdropIds})
      `;
    }
    
    // Record the claim
    await sql`
      INSERT INTO claims (user_fid, amount, shares_count, recipient_address, tx_hash, claimed_shares_ids)
      VALUES (${fid}, ${amountToClaim}, ${rewardsCount}, ${recipientAddress}, ${txHash}, ${shareIds})
    `;
    
    console.log(`Marked ${rewardsCount} rewards as claimed for FID ${fid} (${shareIds.length} shares, ${followIds.length} follows, ${airdropIds.length} airdrops) and recorded claim history`);

    return NextResponse.json({ 
      success: true, 
      transactionHash: txHash,
      claimedAmount: amountToClaim,
      sharesCount: shareIds.length,
      followCount: followIds.length,
      airdropCount: airdropIds.length,
      totalRewardsCount: rewardsCount
    }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in /api/claim-rewards:', error.message);
    if (error.message === 'No rewards to claim.') {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}