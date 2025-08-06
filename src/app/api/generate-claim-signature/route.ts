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
  const { fid, recipientAddress } = body;

  if (!fid || !recipientAddress || !isAddress(recipientAddress)) {
    return NextResponse.json({ error: 'FID and a valid recipient address are required' }, { status: 400 });
  }

  try {
    const [userStats] = await sql`
      SELECT COALESCE(SUM(reward_amount), 0) as total_earnings
      FROM shares WHERE sharer_fid = ${fid}
    `;
    const amountToClaim = Number(userStats.total_earnings);
    if (amountToClaim <= 0) {
      throw new Error('No rewards to claim.');
    }
    const amountInWei = parseUnits(amountToClaim.toString(), 18);

    // Aktuális nonce lekérdezése a szerződésből
    const nonce = await publicClient.readContract({
        address: rewardsClaimAddress,
        abi: rewardsClaimABI,
        functionName: 'nonces',
        args: [recipientAddress as `0x${string}`]
    }) as bigint;

    const domain = {
      name: 'RewardsClaim', version: '1',
      chainId: 8453, verifyingContract: rewardsClaimAddress,
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
    console.error('Signature generation error:', error.message);
    return NextResponse.json({ error: 'Failed to generate claim signature' }, { status: 500 });
  }
}