import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createWalletClient, http, createPublicClient, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI } from '@/lib/contracts';

// Environment variable checks
if (!process.env.NEON_DB_URL) throw new Error('NEON_DB_URL is not set');
if (!process.env.BACKEND_WALLET_PRIVATE_KEY) throw new Error('BACKEND_WALLET_PRIVATE_KEY is not set');
// Új ellenőrzés a Neynar API kulcsra
if (!process.env.NEYNAR_API_KEY) throw new Error('NEYNAR_API_KEY is not set');

const sql = neon(process.env.NEON_DB_URL);
const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('BACKEND_WALLET_PRIVATE_KEY is missing or is not a valid hex string');
}
const account = privateKeyToAccount(privateKey as `0x${string}`);

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

    // --- JAVÍTÁS: FID -> Wallet Cím Feloldása Neynar API-val ---
    console.log(`Resolving wallet address for FID ${sharerFid}...`);
    const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${sharerFid}`, {
        headers: { 
            accept: 'application/json', 
            api_key: process.env.NEYNAR_API_KEY! 
        }
    });

    if (!neynarResponse.ok) {
        console.error("Neynar API request failed:", await neynarResponse.text());
        throw new Error('Failed to fetch user data from Farcaster network.');
    }
    const neynarData = await neynarResponse.json();
    
    // A Neynar a verifikált címek közül az elsődlegeset, vagy a legelsőt adja vissza.
    const sharerAddress = neynarData.users[0]?.verified_addresses?.eth_addresses[0];

    if (!sharerAddress || !isAddress(sharerAddress)) {
        return NextResponse.json({ error: `Could not find a valid, verified wallet address for FID ${sharerFid}. The user must have a wallet connected to their Farcaster account.` }, { status: 400 });
    }
    console.log(`Address for FID ${sharerFid} resolved to: ${sharerAddress}`);

    // --- Smart Contract Interakció a VALÓDI címmel ---
    console.log(`Recording share for address ${sharerAddress} on contract campaign ID ${promo.contract_campaign_id}...`);
    
    const { request: contractRequest } = await publicClient.simulateContract({
      address: PROMO_CONTRACT_ADDRESS,
      abi: PROMO_CONTRACT_ABI,
      functionName: 'recordShare',
      args: [BigInt(promo.contract_campaign_id), sharerAddress as `0x${string}`],
      account,
    });
    
    const txHash = await walletClient.writeContract(contractRequest);
    console.log('On-chain share recorded, tx hash:', txHash);

    // --- Adatbázis frissítése ---
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