import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI } from '@/lib/contracts';

// Environment variable checks
if (!process.env.NEON_DB_URL) throw new Error('NEON_DB_URL is not set');
if (!process.env.BACKEND_WALLET_PRIVATE_KEY) throw new Error('BACKEND_WALLET_PRIVATE_KEY is not set');

// JAVÍTÁS: A hiányzó változó definíciók visszahelyezve
const sql = neon(process.env.NEON_DB_URL);
const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY is missing or is not a valid hex string (must start with 0x)');
}
const account = privateKeyToAccount(privateKey as `0x${string}`);

const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account, chain: base, transport: http() });


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promotionId, sharerFid, sharerUsername, castHash } = body; // `promotionId` is our DB ID

    if (!promotionId || !sharerFid || !sharerUsername || !castHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the contract_campaign_id from our database
    const [promo] = await sql`
        SELECT status, reward_per_share, remaining_budget, contract_campaign_id 
        FROM promotions WHERE id = ${promotionId}
    `;
    if (!promo) return NextResponse.json({ error: 'Promotion not found in DB' }, { status: 404 });
    if (promo.contract_campaign_id === null) return NextResponse.json({ error: 'Promotion not synced with blockchain' }, { status: 500 });
    if (promo.status !== 'active') return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const [recentShare] = await sql`
        SELECT id FROM shares 
        WHERE promotion_id = ${promotionId} AND sharer_fid = ${sharerFid} AND created_at > ${fortyEightHoursAgo}
    `;
    if (recentShare) return NextResponse.json({ error: 'You have already shared this campaign recently' }, { status: 429 });


    console.log(`Recording share for FID ${sharerFid} on contract campaign ID ${promo.contract_campaign_id}...`);
    const sharerAddress = '0x7031D6Db2D5Cc22eAAc870132E6DCee80c486fff'; // Still a placeholder!
    
    // Call the smart contract with the correct ID from our DB
    const { request: contractRequest } = await publicClient.simulateContract({
      address: PROMO_CONTRACT_ADDRESS,
      abi: PROMO_CONTRACT_ABI,
      functionName: 'recordShare',
      args: [BigInt(promo.contract_campaign_id), sharerAddress as `0x${string}`],
      account,
    });
    
    const txHash = await walletClient.writeContract(contractRequest);
    console.log('On-chain share recorded, tx hash:', txHash);

    // Update our database using our internal `promotionId`
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