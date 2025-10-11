import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    let round_id = null;
    try {
      const body = await request.json();
      round_id = body.round_id;
    } catch (error) {
      // No JSON body provided, use null round_id (will find active round)
      round_id = null;
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get round to draw
      let round;
      if (round_id) {
        const roundResult = await client.query(`
          SELECT * FROM weather_lotto_rounds 
          WHERE id = $1 AND status = 'active'
        `, [round_id]);
        
        if (roundResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'Invalid or inactive round ID' },
            { status: 400 }
          );
        }
        round = roundResult.rows[0];
      } else {
        const roundResult = await client.query(`
          SELECT * FROM weather_lotto_rounds 
          WHERE status = 'active'
          ORDER BY round_number DESC 
          LIMIT 1
        `);
        
        if (roundResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'No active round ready for drawing' },
            { status: 400 }
          );
        }
        round = roundResult.rows[0];
      }

      // Get all tickets for this round
      const ticketsResult = await client.query(`
        SELECT * FROM weather_lotto_tickets 
        WHERE round_id = $1
      `, [round.id]);

      const totalTickets = ticketsResult.rows.length;
      let winningSide: 'sunny' | 'rainy' | null = null;
      let winners: any[] = [];
      let totalPayouts = 0;
      let winnersPoolWei = BigInt(0);
      let treasuryAmountWei = BigInt(0);

      if (totalTickets > 0) {
        // Generate random winning side (50/50 chance)
        const random = Math.random();
        winningSide = random < 0.5 ? 'sunny' : 'rainy';

        // Find all winning tickets
        winners = ticketsResult.rows.filter(ticket => ticket.side === winningSide);

        // Calculate payouts
        if (winners.length > 0) {
          const totalWinningTickets = winners.reduce((sum, ticket) => sum + ticket.quantity, 0);
          // Calculate winners pool (70% of total pool) - keep in wei
          const totalPoolWei = BigInt(round.total_pool);
          winnersPoolWei = (totalPoolWei * BigInt(70)) / BigInt(100); // 70% in wei
          treasuryAmountWei = totalPoolWei - winnersPoolWei; // 30% in wei

          // Update ticket payouts
          for (const winner of winners) {
            const payoutPerTicketWei = winnersPoolWei / BigInt(totalWinningTickets);
            const totalPayoutWei = payoutPerTicketWei * BigInt(winner.quantity);

            await client.query(`
              UPDATE weather_lotto_tickets 
              SET payout_amount = $1
              WHERE id = $2
            `, [totalPayoutWei.toString(), winner.id]);
            
            totalPayouts += Number(totalPayoutWei);

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
              winner.player_fid,
              winner.player_address,
              winner.quantity,
              totalPayoutWei.toString()
            ]);
          }

          // Update round with results
          await client.query(`
            UPDATE weather_lotto_rounds 
            SET 
              status = 'completed',
              winning_side = $1,
              winners_pool = $2,
              treasury_amount = $3,
              updated_at = NOW()
            WHERE id = $4
          `, [winningSide, winnersPoolWei.toString(), treasuryAmountWei.toString(), round.id]);
        }
      } else {
        // No tickets sold - just complete the round
        await client.query(`
          UPDATE weather_lotto_rounds 
          SET 
            status = 'completed',
            treasury_amount = $1,
            updated_at = NOW()
          WHERE id = $2
        `, [round.total_pool, round.id]);
      }

      // Update stats (create if not exists)
      await client.query(`
        INSERT INTO weather_lotto_stats (id, total_rounds, total_treasury, total_payouts, current_total_pool)
        VALUES (1, 1, $1, $2, 200000000000000000000000)
        ON CONFLICT (id) DO UPDATE SET
          total_rounds = weather_lotto_stats.total_rounds + 1,
          total_treasury = weather_lotto_stats.total_treasury + $1,
          total_payouts = weather_lotto_stats.total_payouts + $2,
          current_sunny_tickets = 0,
          current_rainy_tickets = 0,
          current_total_pool = 200000000000000000000000,
          updated_at = NOW()
      `, [
        parseInt(round.treasury_amount) || 0,
        totalPayouts || 0
      ]);

      await client.query('COMMIT');

      // Send email notification for manual draw
      try {
        console.log('📧 Sending manual weather lotto results email...');
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
            winners: winners,
            totalPayout: winnersPoolWei.toString(),
            treasuryAmount: treasuryAmountWei.toString()
          })
        });

        if (emailResponse.ok) {
          console.log('✅ Manual weather lotto results email sent successfully');
        } else {
          console.log('⚠️ Manual weather lotto results email failed');
        }
      } catch (emailError) {
        console.log('⚠️ Manual weather lotto results email error (non-critical):', emailError);
      }

      return NextResponse.json({
        success: true,
        round: {
          id: round.id,
          round_number: round.round_number,
          winning_side: winningSide,
          total_tickets: totalTickets,
          winners_count: winners.length,
          winners_pool: winners.length > 0 ? winnersPoolWei.toString() : '0',
          treasury_amount: winners.length > 0 ? treasuryAmountWei.toString() : round.total_pool
        },
        message: `Round ${round.round_number} completed. Winning side: ${winningSide || 'none'}`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error drawing weather lotto winner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to draw winner' },
      { status: 500 }
    );
  }
}
