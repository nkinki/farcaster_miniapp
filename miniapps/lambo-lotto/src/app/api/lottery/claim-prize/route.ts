import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import pool from '../../../../lib/db';
// Redeploy to apply secrets
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '../../../../abis/chessToken';

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

      // Perform onchain payout
      let transactionHash = null;

      // Use TREASURY_PRIVATE_KEY if available, fallback to BACKEND_WALLET_PRIVATE_KEY
      let treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY || process.env.BACKEND_WALLET_PRIVATE_KEY;

      if (treasuryPrivateKey) {
        // Sanitize private key: remove quotes, spaces and ensure 0x prefix
        treasuryPrivateKey = treasuryPrivateKey.trim().replace(/^["'](.+)["']$/, '$1');
        if (!treasuryPrivateKey.startsWith('0x')) {
          treasuryPrivateKey = `0x${treasuryPrivateKey}`;
        }
      }

      console.log('🔑 Treasury Key Status (miniapp):', {
        hasTreasuryKey: !!process.env.TREASURY_PRIVATE_KEY,
        hasBackendKey: !!process.env.BACKEND_WALLET_PRIVATE_KEY,
        usingCombined: !!treasuryPrivateKey,
        keyLength: treasuryPrivateKey ? treasuryPrivateKey.length : 0
      });

      if (treasuryPrivateKey) {
        try {
          // Create wallet client for treasury operations
          const account = privateKeyToAccount(treasuryPrivateKey as `0x${string}`);
          console.log('🏦 Payout Account derived (miniapp):', account.address);

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

          // Direct ERC20 transfer from treasury wallet to winner
          const hash = await walletClient.writeContract({
            address: CHESS_TOKEN_ADDRESS,
            abi: CHESS_TOKEN_ABI,
            functionName: 'transfer',
            args: [winning.player_address as `0x${string}`, amountInWei]
          });

          transactionHash = hash;
          console.log('✅ Onchain payout successful (miniapp):', hash);

        } catch (onchainError) {
          console.error('❌ Onchain payout failed (miniapp):', onchainError);
          client.release();
          return NextResponse.json({
            success: false,
            error: 'Onchain payment failed: ' + (onchainError as Error).message
          }, { status: 500 });
        }
      } else {
        console.log('⚠️ No payout account configured in miniapp - aborting claim');
        client.release();
        return NextResponse.json({
          success: false,
          error: 'Payout system not configured. Please contact administrator.'
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
