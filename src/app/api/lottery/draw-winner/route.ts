import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current active round
      const roundResult = await client.query(`
        SELECT * FROM lottery_draws 
        WHERE status = 'active' 
        ORDER BY draw_number DESC 
        LIMIT 1
      `);

      if (roundResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'No active round found' },
          { status: 400 }
        );
      }

      const round = roundResult.rows[0];

      // Check if draw time has arrived
      if (new Date() < new Date(round.end_time)) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Draw time has not arrived yet' },
          { status: 400 }
        );
      }

      // Get all sold tickets for this round
      const ticketsResult = await client.query(`
        SELECT * FROM lottery_tickets 
        WHERE draw_id = $1
        ORDER BY number ASC
      `, [round.id]);

      if (ticketsResult.rows.length === 0) {
        // No tickets sold, mark round as completed with no winner
        await client.query(`
          UPDATE lottery_draws 
          SET status = 'completed'
          WHERE id = $1
        `, [round.id]);

        await client.query('COMMIT');
        return NextResponse.json({ 
          success: true, 
          message: 'Round completed with no tickets sold',
          round_id: round.id
        });
      }

      // Generate random winning number (1-100)
      const winningNumber = Math.floor(Math.random() * 100) + 1;

      // Find winner (if any ticket matches the winning number)
      const winnerTicket = ticketsResult.rows.find(ticket => ticket.number === winningNumber);

      if (winnerTicket) {
        // Update round with winner
        await client.query(`
          UPDATE lottery_draws 
          SET status = 'completed', 
              winning_number = $1
          WHERE id = $2
        `, [winningNumber, round.id]);

        // Update lottery stats
        await client.query(`
          UPDATE lottery_stats 
          SET last_draw_number = last_draw_number + 1,
              total_tickets = total_tickets + $1,
              active_tickets = active_tickets - $1
          WHERE id = 1
        `, [ticketsResult.rows.length]);

        await client.query('COMMIT');

        return NextResponse.json({ 
          success: true, 
          message: 'Winner selected successfully',
          round_id: round.id,
          winner_fid: winnerTicket.player_fid,
          winning_number: winningNumber,
          jackpot: round.jackpot
        });
      } else {
        // No winner found, mark round as completed
        await client.query(`
          UPDATE lottery_draws 
          SET status = 'completed', 
              winning_number = $1
          WHERE id = $2
        `, [winningNumber, round.id]);

        // Update lottery stats
        await client.query(`
          UPDATE lottery_stats 
          SET last_draw_number = last_draw_number + 1,
              total_tickets = total_tickets + $1,
              active_tickets = active_tickets - $1
          WHERE id = 1
        `, [ticketsResult.rows.length]);

        await client.query('COMMIT');

        return NextResponse.json({ 
          success: true, 
          message: 'Round completed with no winner',
          round_id: round.id,
          winning_number: winningNumber
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error drawing winner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to draw winner' },
      { status: 500 }
    );
  }
}
