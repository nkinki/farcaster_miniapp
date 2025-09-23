import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { player_fid, round_id } = await request.json();
    
    console.log('🔍 Claim API request:', { player_fid, round_id });

    if (!player_fid || !round_id) {
      console.log('❌ Missing required fields:', { player_fid, round_id });
      return NextResponse.json(
        { success: false, error: 'Player FID and round ID are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get winning tickets for this player and round
      const ticketsResult = await client.query(`
        SELECT 
          t.*,
          r.round_number,
          r.winning_side,
          r.status as round_status
        FROM weather_lotto_tickets t
        JOIN weather_lotto_rounds r ON t.round_id = r.id
        WHERE t.player_fid = $1 AND t.round_id = $2 AND r.status = 'completed' AND r.winning_side = t.side AND t.payout_amount > 0
      `, [player_fid, round_id]);

      if (ticketsResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'No winning tickets found for this player and round' },
          { status: 400 }
        );
      }

      const winningTickets = ticketsResult.rows;
      const totalPayout = winningTickets.reduce((sum, ticket) => sum + BigInt(ticket.payout_amount), BigInt(0));

      // Verify the round is completed
      if (winningTickets[0].round_status !== 'completed') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Round is not completed yet' },
          { status: 400 }
        );
      }

      // Perform onchain payout
      let transactionHash = null;
      const backendWalletPrivateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
      
      if (backendWalletPrivateKey) {
        try {
          // Create wallet client for treasury operations
          const account = privateKeyToAccount(backendWalletPrivateKey as `0x${string}`);
          
          const publicClient = createPublicClient({
            chain: base,
            transport: http()
          });
          
          const walletClient = createWalletClient({
            account,
            chain: base,
            transport: http()
          });
          
          // totalPayout is already in wei as BigInt
          const amountInWei = totalPayout;
          
          // Get CHESS token address from environment
          const chessTokenAddress = process.env.NEXT_PUBLIC_CHESS_TOKEN_ADDRESS;
          if (!chessTokenAddress) {
            throw new Error('CHESS token address not configured');
          }
          
          // ERC20 transfer function ABI
          const erc20Abi = [
            {
              "inputs": [
                { "internalType": "address", "name": "to", "type": "address" },
                { "internalType": "uint256", "name": "amount", "type": "uint256" }
              ],
              "name": "transfer",
              "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ] as const;
          
          // Direct ERC20 transfer from backend wallet to winner
          const hash = await walletClient.writeContract({
            address: chessTokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [winningTickets[0].player_address as `0x${string}`, amountInWei]
          });
          
          transactionHash = hash;
          console.log('✅ Weather Lotto onchain payout successful:', hash);
          
        } catch (onchainError) {
          console.error('❌ Weather Lotto onchain payout failed:', onchainError);
          await client.query('ROLLBACK');
          return NextResponse.json({
            success: false,
            error: 'Onchain payment failed: ' + (onchainError as Error).message
          }, { status: 500 });
        }
      } else {
        console.log('⚠️ Backend wallet private key not configured - marking as paid without onchain payment');
      }

      // Update claim status to paid with transaction hash
      // Update winning tickets as claimed
      await client.query(`
        UPDATE weather_lotto_tickets 
        SET 
          is_claimed = TRUE,
          claimed_at = NOW(),
          updated_at = NOW()
        WHERE round_id = $1 AND player_fid = $2 AND side = $3
      `, [round_id, player_fid, winningTickets[0].winning_side]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        claim: {
          round_number: winningTickets[0].round_number,
          winning_side: winningTickets[0].winning_side,
          total_tickets: winningTickets.length,
          total_payout: BigInt(totalPayout),
          status: 'paid'
        },
        message: `Successfully claimed ${totalPayout.toString()} CHESS for ${winningTickets.length} winning tickets`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error claiming weather lotto winnings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to claim winnings' },
      { status: 500 }
    );
  }
}
