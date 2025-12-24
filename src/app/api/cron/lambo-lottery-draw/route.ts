import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

async function performLamboLotteryDraw() {
  const client = await pool.connect();
  console.log('🏁 --- Starting Lambo Lottery Draw (19:05 UTC) --- 🏁');

  try {
    console.log('[1/8] Connecting to database and starting transaction...');
    await client.query('BEGIN');
    console.log('✅ Transaction started.');

    const forceNow = process.env.FORCE_DRAW_NOW === 'true';
    if (forceNow) {
      console.log('⏱️ FORCE NOW enabled – setting end_time to NOW() for active rounds...');
      await client.query(`UPDATE lottery_draws SET end_time = NOW() WHERE status = 'active';`);
    }

    console.log('[2/8] Searching for an active round that is due for drawing...');
    let roundResult = await client.query(`
      SELECT * FROM lottery_draws 
      WHERE status = 'active' AND end_time <= NOW()
      ORDER BY draw_number DESC 
      LIMIT 1
    `);

    if (roundResult.rows.length === 0) {
      console.log('ℹ️ No rounds ready for drawing.');
      await client.query('ROLLBACK');
      return;
    }

    const round = roundResult.rows[0];
    console.log(`✅ Found round to draw: ID #${round.id}, Draw Number #${round.draw_number}`);

    console.log(`[3/8] Fetching all tickets for round ID #${round.id}...`);
    const ticketsResult = await client.query(`
      SELECT * FROM lottery_tickets 
      WHERE round_id = $1
    `, [round.id]);

    const totalTicketsSold = ticketsResult.rows.length;
    console.log(`✅ Found ${totalTicketsSold} tickets.`);

    // --- LOTTERY SORSOLÁS ---
    console.log('[4/8] Generating random winning number...');
    const winningNumber = Math.floor(Math.random() * 100) + 1;
    console.log(`🎲 Winning number: ${winningNumber}`);

    // --- NYERTESEK KERESÉSE ---
    console.log('[5/8] Finding winners...');
    const winnersResult = await client.query(`
      SELECT * FROM lottery_tickets 
      WHERE round_id = $1 AND number = $2
    `, [round.id, winningNumber]);

    const winners = winnersResult.rows;
    console.log(`🏆 Found ${winners.length} winner(s) with number ${winningNumber}`);

    // --- ROUND FRISSÍTÉSE ---
    console.log('[6/8] Updating round status...');
    await client.query(`
      UPDATE lottery_draws 
      SET 
        status = 'completed',
        winning_number = $1,
        end_time = NOW()
      WHERE id = $2
    `, [winningNumber, round.id]);
    console.log('✅ Round marked as completed.');

    // --- NYERTESEK FELDOLGOZÁSA ---
    if (winners.length > 0) {
      console.log('[7/8] Processing winners...');
      const jackpotAmount = parseInt(round.jackpot || '0', 10);
      const payoutPerWinner = Math.floor(jackpotAmount / winners.length);

      for (const winner of winners) {
        await client.query(`
          UPDATE lottery_tickets 
          SET 
            is_winner = true,
            amount_won = $1,
            won_at = NOW()
          WHERE id = $2
        `, [payoutPerWinner, winner.id]);

        console.log(`✅ Winner processed: FID ${winner.player_fid}, Amount: ${(payoutPerWinner / 1e18).toFixed(2)} CHESS`);
      }
    } else {
      console.log('ℹ️ No winners this round - jackpot rolls over.');
    }

    // --- ÚJ ROUND LÉTREHOZÁSA ---
    console.log('[8/8] Creating new round...');
    const newRoundResult = await client.query(`
      INSERT INTO lottery_draws (
        draw_number, 
        jackpot, 
        status, 
        start_time, 
        end_time
      ) VALUES (
        $1, 
        $2, 
        'active', 
        NOW(), 
        NOW() + INTERVAL '24 hours'
      ) RETURNING *
    `, [
      round.draw_number + 1,
      winners.length === 0 ? round.jackpot : '1000000000000000000000000' // 1M CHESS base if no winners
    ]);

    const newRound = newRoundResult.rows[0];
    console.log(`✅ New round created: ID #${newRound.id}, Draw Number #${newRound.draw_number}`);

    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully.');

    // --- EMAIL ÉRTESÍTÉS ---
    try {
      console.log('📧 Sending lottery results email...');

      // Prepare winners data for email
      const winnersData = winners.map(winner => ({
        player_fid: winner.player_fid,
        number: winningNumber,
        amount_won: winners.length > 0 ? Math.floor(parseInt(round.jackpot || '0', 10) / winners.length) : 0
      }));

      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/lottery/send-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          round: {
            id: round.id,
            draw_number: round.draw_number,
            jackpot: round.jackpot
          },
          winningNumber,
          winners: winnersData,
          totalPayout: winners.length > 0 ? parseInt(round.jackpot || '0', 10) : 0,
          nextJackpot: newRound.jackpot
        })
      });

      if (emailResponse.ok) {
        console.log('✅ Lottery results email sent successfully');
      } else {
        console.log('⚠️ Lottery results email failed');
      }
    } catch (emailError) {
      console.log('⚠️ Lottery results email error (non-critical):', emailError);
    }

    console.log('🎉 Lambo Lottery draw completed successfully!');
    console.log(`📊 Round #${round.draw_number} - Winning Number: ${winningNumber} - Winners: ${winners.length}`);

  } catch (error) {
    console.error('❌ Error during lottery draw:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🏁 Lambo Lottery Cron Job Started');

    await performLamboLotteryDraw();

    console.log('✅ Lambo Lottery Cron Job Completed Successfully');

    return NextResponse.json({
      success: true,
      message: 'Lambo Lottery draw completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Lambo Lottery Cron Job Failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Lambo Lottery draw failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  try {
    console.log('🏁 Manual Lambo Lottery Draw Triggered');

    await performLamboLotteryDraw();

    console.log('✅ Manual Lambo Lottery Draw Completed Successfully');

    return NextResponse.json({
      success: true,
      message: 'Manual Lambo Lottery draw completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual Lambo Lottery Draw Failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Manual Lambo Lottery draw failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
