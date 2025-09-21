import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { LOTTO_PAYMENT_ROUTER_ABI, LOTTO_PAYMENT_ROUTER_ADDRESS } from '@/abis/LottoPaymentRouter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { winningId, playerFid } = await request.json();

    if (!winningId || !playerFid) {
      return NextResponse.json(
        { success: false, error: 'Winning ID and Player FID are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Check if the winning exists and is not already claimed
      const checkResult = await client.query(`
        SELECT 
          lw.id,
          lw.amount_won,
          lw.claimed_at,
          lt.player_address
        FROM lottery_winnings lw
        JOIN lottery_tickets lt ON lw.ticket_id = lt.id
        WHERE lw.id = $1 AND lw.player_fid = $2
      `, [winningId, playerFid]);

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Winning not found or not owned by user' },
          { status: 404 }
        );
      }

      const winning = checkResult.rows[0];

      if (winning.claimed_at) {
        return NextResponse.json(
          { success: false, error: 'Prize already claimed' },
          { status: 400 }
        );
      }

      // Perform onchain payout using the LottoPaymentRouter contract
      let transactionHash = null;
      
      try {
        // Create wallet client for treasury operations
        const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
        if (!treasuryPrivateKey) {
          throw new Error('Treasury private key not configured');
        }
        
        const account = privateKeyToAccount(treasuryPrivateKey as `0x${string}`);
        
        const publicClient = createPublicClient({
          chain: base,
          transport: http()
        });
        
        const walletClient = createWalletClient({
          account,
          chain: base,
          transport: http()
        });
        
        // Convert amount to wei (assuming amount_won is in CHESS tokens, not wei)
        const amountInWei = parseUnits(winning.amount_won.toString(), 18);
        
        // Call the payout function on the contract
        const hash = await walletClient.writeContract({
          address: LOTTO_PAYMENT_ROUTER_ADDRESS as `0x${string}`,
          abi: LOTTO_PAYMENT_ROUTER_ABI,
          functionName: 'payout',
          args: [winning.player_address as `0x${string}`, amountInWei]
        });
        
        transactionHash = hash;
        console.log('✅ Onchain payout successful:', hash);
        
      } catch (onchainError) {
        console.error('❌ Onchain payout failed:', onchainError);
        // Don't mark as claimed if onchain payment fails
        return NextResponse.json({
          success: false,
          error: 'Onchain payment failed: ' + (onchainError as Error).message
        }, { status: 500 });
      }
      
      // Update treasury balance (subtract the claimed amount)
      await client.query(`
        UPDATE lottery_stats 
        SET total_jackpot = total_jackpot - $1
        WHERE id = 1
      `, [winning.amount_won]);
      
      // Mark as claimed with transaction hash
      const updateResult = await client.query(`
        UPDATE lottery_winnings 
        SET claimed_at = NOW(), transaction_hash = $2
        WHERE id = $1
        RETURNING *
      `, [winningId, transactionHash]);

      client.release();

      return NextResponse.json({
        success: true,
        message: 'Prize claimed successfully',
        winning: updateResult.rows[0]
      });

    } catch (error) {
      client.release();
      throw error;
    }

  } catch (error) {
    console.error('Error claiming prize:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to claim prize' },
      { status: 500 }
    );
  }
}
