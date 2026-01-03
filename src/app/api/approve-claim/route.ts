// Approve-based claim API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';
const REWARDS_CLAIM_ADDRESS = '0xb8d08800d79850375c10a96e87fd196c0e52aa5a';

const CHESS_TOKEN_ABI = [
  {
    "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" }],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export async function POST(request: NextRequest) {
  try {
    const { recipientAddress, amount } = await request.json();

    if (!process.env.BACKEND_WALLET_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Backend wallet not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(process.env.BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);

    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    });

    const walletClient = createWalletClient({
      chain: base,
      transport: http(),
      account
    });

    const amountInWei = parseEther(amount.toString());

    console.log('🔄 Approve-based claim process starting...');
    console.log('Recipient:', recipientAddress);
    console.log('Amount:', amountInWei.toString());
    console.log('Backend wallet:', account.address);

    // 1. Check the allowance
    const currentAllowance = await publicClient.readContract({
      address: CHESS_TOKEN_ADDRESS,
      abi: CHESS_TOKEN_ABI,
      functionName: 'allowance',
      args: [account.address, REWARDS_CLAIM_ADDRESS]
    }) as bigint;

    console.log('Current allowance:', currentAllowance.toString());

    // 2. If not enough allowance, approve it
    if (currentAllowance < amountInWei) {
      console.log('🔄 Approving CHESS tokens...');

      const approveHash = await walletClient.writeContract({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [REWARDS_CLAIM_ADDRESS, amountInWei]
      });

      console.log('Approve transaction hash:', approveHash);

      // Wait for the transaction confirmation
      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveHash
      });

      console.log('Approve transaction confirmed:', approveReceipt.status);
    }

    // 3. Now the contract can use the tokens
    // We could call the claim function here, but for now we just return the approve status

    return NextResponse.json({
      success: true,
      message: 'Tokens approved for claim contract',
      approveCompleted: currentAllowance < amountInWei,
      allowance: amountInWei.toString(),
      recipientAddress,
      amount: amountInWei.toString()
    });

  } catch (error: any) {
    console.error('Approve claim error:', error);
    return NextResponse.json({
      error: 'Approve claim failed',
      details: error.message
    }, { status: 500 });
  }
}