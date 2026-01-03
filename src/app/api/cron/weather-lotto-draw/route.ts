import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

async function performWeatherLottoDraw() {
  const client = await pool.connect();
  console.log('🌤️ --- Starting Weather Lotto Draw (20:05 UTC) --- 🌤️');

  try {
    console.log('[1/8] Connecting to database and starting transaction...');
    await client.query('BEGIN');
    console.log('✅ Transaction started.');

    const forceNow = process.env.FORCE_DRAW_NOW === 'true';
    if (forceNow) {
      console.log('⏱️ FORCE NOW enabled – setting end_time to NOW() for active rounds...');
      await client.query(`UPDATE weather_lotto_rounds SET end_time = NOW() WHERE status = 'active';`);
    }

    console.log('[2/8] Searching for an active round that is due for drawing...');
    let roundResult = await client.query(`
      SELECT * FROM weather_lotto_rounds 
      WHERE status = 'active' AND end_time <= NOW()
      ORDER BY round_number DESC 
      LIMIT 1
    `);

    if (roundResult.rows.length === 0) {
      console.log('ℹ️ No rounds ready for drawing.');
      await client.query('ROLLBACK');
      return;
    }

    const round = roundResult.rows[0];
    console.log(`✅ Found round to draw: ID #${round.id}, Round Number #${round.round_number}`);

    console.log(`[3/8] Fetching all tickets for round ID #${round.id}...`);
    const ticketsResult = await client.query(`
      SELECT * FROM weather_lotto_tickets 
      WHERE round_id = $1
    `, [round.id]);

    const totalTicketsSold = ticketsResult.rows.length;
    console.log(`✅ Found ${totalTicketsSold} tickets.`);

    // --- WEATHER DRAW ---
    console.log('[4/8] Generating random weather result...');
    const random = Math.random();
    const winningSide = random < 0.5 ? 'sunny' : 'rainy';
    console.log(`🎲 Random number: ${random.toFixed(4)}`);
    console.log(`🏆 Winning side: ${winningSide.toUpperCase()}`);

    // Find winning tickets
    const winningTickets = ticketsResult.rows.filter(ticket => ticket.side === winningSide);
    const totalWinningTickets = winningTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);

    console.log(`[5/8] Processing ${winningTickets.length} winning ticket purchases...`);
    console.log(`📊 Total winning tickets: ${totalWinningTickets}`);

    let totalPayout = 0;
    let treasuryAmount = 0;

    if (totalWinningTickets > 0) {
      // Calculate payouts using BigInt
      const totalPoolWei = BigInt(round.total_pool);
      const winnersPoolWei = (totalPoolWei * BigInt(70)) / BigInt(100); // 70% winners
      const treasuryAmountWei = totalPoolWei - winnersPoolWei; // 30% treasury

      console.log(`💰 Total pool: ${(Number(totalPoolWei) / 1e18).toFixed(2)} CHESS`);
      console.log(`🏆 Winners pool (70%): ${(Number(winnersPoolWei) / 1e18).toFixed(2)} CHESS`);
      console.log(`🏛️ Treasury (30%): ${(Number(treasuryAmountWei) / 1e18).toFixed(2)} CHESS`);

      // Update ticket payouts and create claims
      for (const ticket of winningTickets) {
        const payoutPerTicketWei = winnersPoolWei / BigInt(totalWinningTickets);
        const totalTicketPayoutWei = payoutPerTicketWei * BigInt(ticket.quantity);
        totalPayout += Number(totalTicketPayoutWei);

        console.log(`🎫 Ticket ID ${ticket.id}: ${ticket.quantity} tickets → ${(Number(totalTicketPayoutWei) / 1e18).toFixed(2)} CHESS`);

        // Update ticket payout
        await client.query(`
          UPDATE weather_lotto_tickets 
          SET payout_amount = $1
          WHERE id = $2
        `, [totalTicketPayoutWei.toString(), ticket.id]);

        // Create claim record
        await client.query(`
          INSERT INTO weather_lotto_claims (
            round_id,
            player_fid,
            player_address,
            total_tickets,
            total_payout,
            status
          ) VALUES ($1, $2, $3, $4, $5, 'pending')
        `, [
          round.id,
          ticket.player_fid,
          ticket.player_address,
          ticket.quantity,
          totalTicketPayoutWei.toString()
        ]);
      }

      treasuryAmount = Number(treasuryAmountWei);
    } else {
      // No winning tickets - all goes to treasury
      treasuryAmount = Number(BigInt(round.total_pool));
      console.log(`😔 No winning tickets. All ${(treasuryAmount / 1e18).toFixed(2)} CHESS goes to treasury.`);
    }

    console.log('[6/8] Updating round with results...');
    await client.query(`
      UPDATE weather_lotto_rounds 
      SET 
        status = 'completed',
        winning_side = $1,
        winners_pool = $2,
        treasury_amount = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [winningSide, totalPayout.toString(), treasuryAmount.toString(), round.id]);

    console.log('[7/8] Updating global statistics...');
    await client.query(`
      UPDATE weather_lotto_stats 
      SET 
        total_rounds = total_rounds + 1,
        total_treasury = total_treasury + $1,
        total_payouts = total_payouts + $2,
        current_sunny_tickets = 0,
        current_rainy_tickets = 0,
        current_total_pool = 200000000000000000000000,
        updated_at = NOW()
      WHERE id = 1
    `, [treasuryAmount.toString(), totalPayout.toString()]);

    console.log('[8/8] Committing transaction...');
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!');

    // --- OUTPUT RESULTS ---
    console.log('\n🎉 === WEATHER LOTTO DRAW COMPLETED === 🎉');
    console.log(`📅 Round: #${round.round_number}`);
    console.log(`🏆 Winning Side: ${winningSide.toUpperCase()}`);
    console.log(`🎫 Total Tickets Sold: ${totalTicketsSold}`);
    console.log(`🏆 Winning Tickets: ${totalWinningTickets}`);
    console.log(`💰 Total Payout: ${(totalPayout / 1e18).toFixed(2)} CHESS`);
    console.log(`🏛️ Treasury: ${(treasuryAmount / 1e18).toFixed(2)} CHESS`);
    console.log(`👥 Winners: ${winningTickets.length} players`);

    if (winningTickets.length > 0) {
      console.log('\n🏆 WINNERS:');
      winningTickets.forEach((ticket, index) => {
        console.log(`  ${index + 1}. FID ${ticket.player_fid} - ${ticket.quantity} tickets - ${(ticket.payout_amount / 1e18).toFixed(2)} CHESS`);
      });
    }

    console.log('\n✅ Weather Lotto draw completed successfully!');

    // Draw completed successfully
    console.log('✅ Weather Lotto draw completed successfully');

    // Send email notification
    try {
      console.log('📧 Sending weather lotto results email...');
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/weather-lotto/send-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          round: {
            id: round.id,
            round_number: round.round_number
          },
          winningSide,
          winners: winningTickets,
          totalPayout,
          treasuryAmount
        })
      });

      if (emailResponse.ok) {
        console.log('✅ Weather Lotto results email sent successfully');
      } else {
        console.log('⚠️ Weather Lotto results email failed');
      }
    } catch (emailError) {
      console.log('⚠️ Weather Lotto results email error (non-critical):', emailError);
    }

  } catch (error) {
    console.error('❌ Error during weather lotto draw:', error);
    await client.query('ROLLBACK');
    console.log('🔄 Transaction rolled back due to error.');
    throw error;
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🌤️ Weather Lotto Cron Job Started');

    await performWeatherLottoDraw();

    console.log('✅ Weather Lotto Cron Job Completed Successfully');

    return NextResponse.json({
      success: true,
      message: 'Weather Lotto draw completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Weather Lotto Cron Job Failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Weather Lotto draw failed',
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
    const { force } = await request.json().catch(() => ({}));

    if (force) {
      process.env.FORCE_DRAW_NOW = 'true';
    }

    console.log('🌤️ Weather Lotto Manual Draw Started');

    await performWeatherLottoDraw();

    console.log('✅ Weather Lotto Manual Draw Completed Successfully');

    return NextResponse.json({
      success: true,
      message: 'Weather Lotto manual draw completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Weather Lotto Manual Draw Failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Weather Lotto manual draw failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
