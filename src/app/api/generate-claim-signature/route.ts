// FÁJL: /src/app/api/generate-claim-signature/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { privateKeyToAccount } from 'viem/accounts';
import { parseUnits, isAddress, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { rewardsClaimAddress, rewardsClaimABI } from '@/abis/rewardsClaim';

const sql = neon(process.env.NEON_DB_URL!);
const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY as `0x${string}`;
const signerAccount = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({ chain: base, transport: http() });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fid, recipientAddress, contractAddress, amount: fixedAmount } = body;

  if (!fid || !recipientAddress || !isAddress(recipientAddress)) {
    return NextResponse.json({ error: 'FID and a valid recipient address are required' }, { status: 400 });
  }

  // DailyReward szerződés támogatása
  const isDailyReward = contractAddress === '0xa5c59fb76f3e2012dfd572739b9d5516034f1ff8';
  console.log('Contract type:', isDailyReward ? 'DailyReward' : 'RewardsClaim');

  try {
    let amountToClaim: number;
    let amountInWei: bigint;

    if (isDailyReward) {
      // DailyReward: fix 10,000 CHESS
      amountToClaim = fixedAmount ? Number(fixedAmount) : 10000;
      amountInWei = parseUnits(amountToClaim.toString(), 18);
      console.log('DailyReward amount:', amountToClaim, 'CHESS');
    } else {
      // RewardsClaim: adatbázisból lekérdezett összeg
      const [userStats] = await sql`
        SELECT COALESCE(SUM(reward_amount), 0) as total_earnings
        FROM shares WHERE sharer_fid = ${fid}
      `;
      amountToClaim = Number(userStats.total_earnings);
      if (amountToClaim <= 0) {
        throw new Error('No rewards to claim.');
      }
      amountInWei = parseUnits(amountToClaim.toString(), 18);
      console.log('RewardsClaim amount:', amountToClaim, 'CHESS');
    }

    // Nonce lekérdezése (DailyReward esetén 0, mert nincs nonce rendszer)
    let nonce: bigint = BigInt(0);
    
    if (!isDailyReward) {
      // Csak RewardsClaim esetén kérdezzük le a nonce-t
      nonce = await publicClient.readContract({
          address: rewardsClaimAddress,
          abi: rewardsClaimABI,
          functionName: 'nonces',
          args: [recipientAddress as `0x${string}`]
      }) as bigint;
    }
    
    console.log('Nonce:', nonce.toString());

    // Domain beállítása a szerződés típusa alapján
    const domain = isDailyReward ? {
      name: 'DailyReward', 
      version: '1',
      chainId: 8453, 
      verifyingContract: contractAddress as `0x${string}`,
    } : {
      name: 'RewardsClaim', 
      version: '1',
      chainId: 8453, 
      verifyingContract: rewardsClaimAddress,
    };
    const types = {
      Claim: [
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
      ],
    };
    const message = { recipient: recipientAddress, amount: amountInWei, nonce: nonce };

    console.log('Signing data:', { domain, types, message });
    console.log('Signer address:', signerAccount.address);
    
    const signature = await signerAccount.signTypedData({ domain, types, primaryType: 'Claim', message });

    console.log('Generated signature:', signature);
    console.log('Amount in wei:', amountInWei.toString());
    console.log('Nonce:', nonce.toString());

    return NextResponse.json({ 
      signature,
      amount: amountInWei.toString(),
      nonce: nonce.toString(),
    });
  } catch (error: any) {
    console.error('Signature generation error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Részletesebb hibakezelés
    let errorMessage = 'Failed to generate claim signature';
    if (error.message.includes('BACKEND_WALLET_PRIVATE_KEY')) {
      errorMessage = 'Backend wallet private key not configured';
    } else if (error.message.includes('NEON_DB_URL')) {
      errorMessage = 'Database connection not configured';
    } else if (error.message.includes('NEYNAR_API_KEY')) {
      errorMessage = 'Neynar API key not configured';
    } else if (error.message.includes('No rewards to claim')) {
      errorMessage = 'No rewards to claim for this user';
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}