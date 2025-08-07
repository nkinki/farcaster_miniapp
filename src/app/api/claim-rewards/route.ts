// FÁJL: /src/app/api/claim-rewards/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createWalletClient, http, createPublicClient, isAddress, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';

if (!process.env.NEON_DB_URL) throw new Error('NEON_DB_URL is not set');
if (!process.env.BACKEND_WALLET_PRIVATE_KEY) throw new Error('BACKEND_WALLET_PRIVATE_KEY is not set');
if (!process.env.NEYNAR_API_KEY) throw new Error('NEYNAR_API_KEY is not set');

const sql = neon(process.env.NEON_DB_URL!);
const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY as `0x${string}`;
const treasuryAccount = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account: treasuryAccount, chain: base, transport: http() });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fid } = body;

  if (!fid) {
    return NextResponse.json({ error: 'FID is required' }, { status: 400 });
  }

  try {
    // Only count unclaimed rewards
    const [userStats] = await sql`
        SELECT 
          COALESCE(SUM(reward_amount), 0) as pending_earnings,
          COUNT(*) as pending_shares
        FROM shares 
        WHERE sharer_fid = ${fid} AND reward_claimed = FALSE
    `;

    const amountToClaim = Number(userStats.pending_earnings);
    const sharesCount = Number(userStats.pending_shares);
    
    if (!amountToClaim || amountToClaim <= 0) {
      throw new Error('No rewards to claim.');
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

    // Mark shares as claimed instead of deleting them
    const claimedShares = await sql`
      UPDATE shares 
      SET reward_claimed = TRUE, claimed_at = NOW()
      WHERE sharer_fid = ${fid} AND reward_claimed = FALSE 
      RETURNING *
    `;
    const claimedCount = claimedShares.length;
    
    console.log(`Marked ${claimedCount} shares as claimed for FID ${fid}.`);
    
    // TODO: Record the payout in payouts table when it's created
    // await sql`INSERT INTO payouts (user_fid, amount, recipient_address, tx_hash, shares_count) VALUES (${fid}, ${amountToClaim}, ${recipientAddress}, ${txHash}, ${sharesCount})`;

    return NextResponse.json({ 
      success: true, 
      transactionHash: txHash,
      claimedAmount: amountToClaim,
      sharesCount: claimedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in /api/claim-rewards:', error.message);
    if (error.message === 'No rewards to claim.') {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}