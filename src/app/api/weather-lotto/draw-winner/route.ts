import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { round_id } = await request.json();

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

      if (totalTickets > 0) {
        // Generate random winning side (50/50 chance)
        const random = Math.random();
        winningSide = random < 0.5 ? 'sunny' : 'rainy';

        // Find all winning tickets
        winners = ticketsResult.rows.filter(ticket => ticket.side === winningSide);

        // Calculate payouts
        if (winners.length > 0) {
          const totalWinningTickets = winners.reduce((sum, ticket) => sum + ticket.quantity, 0);
          const winnersPool = Math.floor(parseInt(round.total_pool) * 0.7); // 70% winners
          const treasuryAmount = parseInt(round.total_pool) - winnersPool; // 30% treasury

          // Update ticket payouts
          for (const winner of winners) {
            const payoutPerTicket = Math.floor(winnersPool / totalWinningTickets);
            const totalPayout = payoutPerTicket * winner.quantity;

            await client.query(`
              UPDATE weather_lotto_tickets 
              SET payout_amount = $1
              WHERE id = $2
            `, [totalPayout.toString(), winner.id]);

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
              totalPayout.toString()
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
          `, [winningSide, winnersPool.toString(), treasuryAmount.toString(), round.id]);
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

      // Update stats
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
      `, [
        round.treasury_amount || 0,
        winners.reduce((sum, w) => sum + (w.payout_amount || 0), 0)
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        round: {
          id: round.id,
          round_number: round.round_number,
          winning_side: winningSide,
          total_tickets: totalTickets,
          winners_count: winners.length,
          winners_pool: winners.length > 0 ? Math.floor(parseInt(round.total_pool) * 0.7) : 0,
          treasury_amount: winners.length > 0 ? parseInt(round.total_pool) - Math.floor(parseInt(round.total_pool) * 0.7) : parseInt(round.total_pool)
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
