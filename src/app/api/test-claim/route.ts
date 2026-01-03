// Test endpoint for testing the claim function
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { rewardsClaimAddress, rewardsClaimABI } from '@/abis/rewardsClaim';

const publicClient = createPublicClient({ chain: base, transport: http() });

export async function GET(request: NextRequest) {
  try {
    // Test data
    const testRecipient = '0x1234567890123456789012345678901234567890';
    const testAmount = parseUnits('1', 18); // 1 CHESS

    console.log('Testing claim function with:');
    console.log('Recipient:', testRecipient);
    console.log('Amount:', testAmount.toString());

    // Get the nonce
    const nonce = await publicClient.readContract({
      address: rewardsClaimAddress,
      abi: rewardsClaimABI,
      functionName: 'nonces',
      args: [testRecipient as `0x${string}`]
    });

    console.log('Nonce:', nonce.toString());

    // Check the contract's Chess token balance
    const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';
    const CHESS_TOKEN_ABI = [
      {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
    ];

    const contractBalance = await publicClient.readContract({
      address: CHESS_TOKEN_ADDRESS,
      abi: CHESS_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [rewardsClaimAddress]
    }) as bigint;

    console.log('Contract CHESS balance:', contractBalance.toString());

    // Try to simulate the claim call with a dummy signature
    try {
      const result = await publicClient.simulateContract({
        address: rewardsClaimAddress,
        abi: rewardsClaimABI,
        functionName: 'claim',
        args: [testRecipient as `0x${string}`, testAmount, '0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234'],
        account: testRecipient as `0x${string}`
      });

      return NextResponse.json({
        success: true,
        message: 'Claim simulation successful',
        nonce: nonce.toString(),
        contractBalance: contractBalance.toString()
      });

    } catch (simError: any) {
      console.error('Simulation error:', simError);

      return NextResponse.json({
        success: false,
        error: 'Claim simulation failed',
        details: simError.message,
        nonce: nonce.toString(),
        contractBalance: contractBalance.toString()
      });
    }

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}