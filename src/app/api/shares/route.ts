import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI } from '@/lib/contracts';

// Environment variable checks
if (!process.env.NEON_DB_URL) throw new Error('NEON_DB_URL is not set');
if (!process.env.BACKEND_WALLET_PRIVATE_KEY) throw new Error('BACKEND_WALLET_PRIVATE_KEY is not set');

const sql = neon(process.env.NEON_DB_URL);
const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY is missing or is not a valid hex string (must start with 0x)');
}
const account = privateKeyToAccount(privateKey as `0x${string}`);

// Viem clients for blockchain interaction
const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account, chain: base, transport: http() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promotionId, sharerFid, sharerUsername, castHash } = body;

    if (!promotionId || !sharerFid || !sharerUsername || !castHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- Database Validations ---
    const [promo] = await sql`
        SELECT status, reward_per_share, remaining_budget FROM promotions WHERE id = ${promotionId}
    `;
    if (!promo) return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    if (promo.status !== 'active') return NextResponse.json({ error: 'This campaign is not active' }, { status: 400 });
    if (promo.remaining_budget < promo.reward_per_share) return NextResponse.json({ error: 'Campaign has insufficient budget' }, { status: 400 });

    // Check for recent shares to prevent spam (e.g., 48-hour limit)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const [recentShare] = await sql`
        SELECT id FROM shares 
        WHERE promotion_id = ${promotionId} AND sharer_fid = ${sharerFid} AND created_at > ${fortyEightHoursAgo}
    `;
    if (recentShare) return NextResponse.json({ error: 'You have already shared this campaign recently' }, { status: 429 });

    // --- Smart Contract Interaction ---
    console.log(`Recording share for FID ${sharerFid} on campaign ${promotionId}...`);

    // IMPORTANT: To call `recordShare`, you need the user's wallet address, not their FID.
    // You must use an API like Neynar to resolve the FID to a verified wallet address.
    // For this example, we will simulate this by using the backend wallet's address.
    // REPLACE THIS IN PRODUCTION.
    const sharerAddress = '0x...'; // TODO: Replace with a call to a Farcaster API (e.g., Neynar) to get address from FID.
    if (sharerAddress === '0x...') {
        // This is a placeholder; in a real scenario, you'd throw an error if the address isn't found.
        console.warn("Using placeholder address for sharer. Replace with FID-to-address resolution API.");
    }

    const { request: contractRequest } = await publicClient.simulateContract({
      address: PROMO_CONTRACT_ADDRESS,
      abi: PROMO_CONTRACT_ABI,
      functionName: 'recordShare',
      args: [BigInt(promotionId), sharerAddress as `0x${string}`],
      account,
    });
    
    const txHash = await walletClient.writeContract(contractRequest);
    console.log('On-chain share recorded, tx hash:', txHash);

    // --- Update Database ---
    await sql`
      INSERT INTO shares (promotion_id, sharer_fid, sharer_username, cast_hash, reward_amount)
      VALUES (${promotionId}, ${sharerFid}, ${sharerUsername}, ${castHash}, ${promo.reward_per_share})
    `;
    
    await sql`
      UPDATE promotions
      SET shares_count = shares_count + 1, remaining_budget = remaining_budget - ${promo.reward_per_share}
      WHERE id = ${promotionId}
    `;

    return NextResponse.json({ success: true, transactionHash: txHash }, { status: 201 });

  } catch (error: any) {
    console.error('API Error:', error);
    if (error.shortMessage) {
        return NextResponse.json({ error: error.shortMessage }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}