import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI } from '@/lib/contracts';

// ... (Környezeti változók és kliensek beállítása változatlan) ...

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promotionId, sharerFid, sharerUsername, castHash } = body; // A `promotionId` a mi DB ID-nk

    if (!promotionId || !sharerFid || !sharerUsername || !castHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // JAVÍTÁS: Lekérdezzük a contract_campaign_id-t az adatbázisból
    const [promo] = await sql`
        SELECT status, reward_per_share, remaining_budget, contract_campaign_id 
        FROM promotions WHERE id = ${promotionId}
    `;
    if (!promo) return NextResponse.json({ error: 'Promotion not found in DB' }, { status: 404 });
    if (promo.contract_campaign_id === null) return NextResponse.json({ error: 'Promotion not synced with blockchain' }, { status: 500 });
    if (promo.status !== 'active') return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    
    // ... (a többi adatbázis-validáció változatlan) ...

    console.log(`Recording share for FID ${sharerFid} on contract campaign ID ${promo.contract_campaign_id}...`);
    const sharerAddress = '0x7031D6Db2D5Cc22eAAc870132E6DCee80c486fff'; // Még mindig placeholder!
    
    // JAVÍTÁS: A `recordShare`-nek a contract ID-ját adjuk át, nem a mi adatbázis ID-nkat!
    const { request: contractRequest } = await publicClient.simulateContract({
      address: PROMO_CONTRACT_ADDRESS,
      abi: PROMO_CONTRACT_ABI,
      functionName: 'recordShare',
      args: [BigInt(promo.contract_campaign_id), sharerAddress as `0x${string}`],
      account,
    });
    
    const txHash = await walletClient.writeContract(contractRequest);
    console.log('On-chain share recorded, tx hash:', txHash);

    // --- Adatbázis frissítése a mi ID-nk (`promotionId`) alapján ---
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