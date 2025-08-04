import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createWalletClient, http, createPublicClient, isAddress, TransactionReceipt } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI } from '@/lib/contracts';

// Környezeti változók ellenőrzése
if (!process.env.NEON_DB_URL) {
  throw new Error('NEON_DB_URL is not set');
}
if (!process.env.BACKEND_WALLET_PRIVATE_KEY) {
  throw new Error('BACKEND_WALLET_PRIVATE_KEY is not set');
}
if (!process.env.NEYNAR_API_KEY) {
  throw new Error('NEYNAR_API_KEY is not set');
}

const sql = neon(process.env.NEON_DB_URL);
const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY as `0x${string}`;
if (!privateKey || !privateKey.startsWith('0x')) {
  throw new Error('BACKEND_WALLET_PRIVATE_KEY is missing or is not a valid hex string');
}
const account = privateKeyToAccount(privateKey);

// Kliensek inicializálása
const publicClient = createPublicClient({ chain: base, transport: http() });
const walletClient = createWalletClient({ account, chain: base, transport: http() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promotionId, sharerFid, sharerUsername, castHash } = body;

    if (!promotionId || !sharerFid || !sharerUsername || !castHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- Adatbázis validációk ---
    const [promo] = await sql`
        SELECT status, reward_per_share, remaining_budget, contract_campaign_id 
        FROM promotions WHERE id = ${promotionId}
    `;
    if (!promo) {
      return NextResponse.json({ error: 'Promotion not found in DB' }, { status: 404 });
    }
    if (promo.contract_campaign_id === null) {
      return NextResponse.json({ error: 'Promotion not synced with blockchain' }, { status: 500 });
    }
    if (promo.status !== 'active') {
      return NextResponse.json({ error: 'This campaign is not active' }, { status: 400 });
    }
    
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const [recentShare] = await sql`
        SELECT id FROM shares 
        WHERE promotion_id = ${promotionId} AND sharer_fid = ${sharerFid} AND created_at > ${fortyEightHoursAgo}
    `;
    if (recentShare) {
      return NextResponse.json({ error: 'You have already shared this campaign recently' }, { status: 429 });
    }

    // --- FID -> Wallet Cím Feloldása Neynar API-val ---
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
    const sharerAddress = neynarData.users[0]?.verified_addresses?.eth_addresses[0];

    if (!sharerAddress || !isAddress(sharerAddress)) {
      return NextResponse.json({ error: `Could not find a valid, verified wallet address for FID ${sharerFid}. The user must have a wallet connected to their Farcaster account.` }, { status: 400 });
    }
    console.log(`Address for FID ${sharerFid} resolved to: ${sharerAddress}`);

    // --- Smart Contract Interakció ---
    console.log(`Recording share for address ${sharerAddress} on contract campaign ID ${promo.contract_campaign_id}...`);
    
    // 1. Szimuláció
    const { request: contractRequest } = await publicClient.simulateContract({
      address: PROMO_CONTRACT_ADDRESS,
      abi: PROMO_CONTRACT_ABI,
      functionName: 'recordShare',
      args: [BigInt(promo.contract_campaign_id), sharerAddress as `0x${string}`],
      account,
    });
    
    // 2. Tranzakció elküldése
    const txHash = await walletClient.writeContract(contractRequest);
    console.log('Transaction sent, awaiting confirmation. Hash:', txHash);

    // 3. VÁRAKOZÁS A TRANZAKCIÓ MEGERŐSÍTÉSÉRE (EZ A KULCSLÉPÉS)
    const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // 4. SIKERESSÉG ELLENŐRZÉSE A VISSZAIGAZOLÁS (RECEIPT) ALAPJÁN
    if (receipt.status === 'reverted') {
      console.error(`Transaction was reverted on-chain. Hash: ${txHash}`);
      // A frontend felé egyértelmű hibaüzenetet küldünk.
      throw new Error('On-chain transaction failed. The campaign might be out of budget or you have already participated.');
    }
    
    console.log('Transaction confirmed successfully. Updating database...');

    // 5. CSAK ÉS KIZÁRÓLAG SIKERES ON-CHAIN TRANZAKCIÓ UTÁN FRISSÍTJÜK AZ ADATBÁZIST
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO shares (promotion_id, sharer_fid, sharer_username, cast_hash, reward_amount, tx_hash)
        VALUES (${promotionId}, ${sharerFid}, ${sharerUsername}, ${castHash}, ${promo.reward_per_share}, ${txHash})
      `;
      
      await tx`
        UPDATE promotions
        SET shares_count = shares_count + 1, remaining_budget = remaining_budget - ${promo.reward_per_share}
        WHERE id = ${promotionId}
      `;
    });

    return NextResponse.json({ success: true, transactionHash: txHash }, { status: 201 });

  } catch (error: any) {
    console.error('API Error:', error);
    // A viem hibáknak gyakran van egy `shortMessage` tulajdonsága, ami érthetőbb a felhasználónak.
    const errorMessage = error.shortMessage || error.message || 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}