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

      // Step 1: Get current active round
      const roundResult = await client.query(`
        SELECT * FROM lambo_lottery_rounds 
        WHERE status = 'active' 
        ORDER BY round_number DESC 
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

      // Step 2: Check if draw time has arrived
      if (new Date() < new Date(round.draw_date)) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Draw time has not arrived yet' },
          { status: 400 }
        );
      }

      // Step 3: Get all sold tickets for this round
      const ticketsResult = await client.query(`
        SELECT * FROM lambo_lottery_tickets 
        WHERE round_id = $1
        ORDER BY ticket_number ASC
      `, [round.id]);

      let winnerFid: number | null = null;
      let winningNumber: number | null = null;

      if (ticketsResult.rows.length > 0) {
        // Generate random winning number (1-100)
        winningNumber = Math.floor(Math.random() * 100) + 1;

        // Find winner (if any ticket matches the winning number)
        const winnerTicket = ticketsResult.rows.find(ticket => ticket.ticket_number === winningNumber);
        
        if (winnerTicket) {
          winnerFid = winnerTicket.fid;
        }
      }

      // Step 4: Complete current round
      await client.query(`
        UPDATE lambo_lottery_rounds 
        SET status = 'completed', 
            winner_fid = $1, 
            winner_number = $2, 
            updated_at = NOW()
        WHERE id = $3
      `, [winnerFid, winningNumber, round.id]);

      // Step 5: Update lottery stats
      if (winnerFid) {
        await client.query(`
          UPDATE lambo_lottery_stats 
          SET total_rounds = total_rounds + 1,
              total_prize_distributed = total_prize_distributed + $1,
              updated_at = NOW()
          WHERE id = 1
        `, [round.prize_pool]);
      } else {
        await client.query(`
          UPDATE lambo_lottery_stats 
          SET total_rounds = total_rounds + 1,
              updated_at = NOW()
          WHERE id = 1
        `);
      }

      // Step 6: Calculate new prize pool for next round
      let newPrizePool = 1000000; // Default 1M CHESS tokens
      
      if (ticketsResult.rows.length > 0) {
        // 70% of ticket sales go to next round's prize pool
        const ticketRevenue = ticketsResult.rows.length * 20000; // 20,000 CHESS per ticket
        const carryOverAmount = Math.floor(ticketRevenue * 0.7);
        newPrizePool = 1000000 + carryOverAmount;
      }

      // Step 7: Create new round
      const nextRoundNumber = round.round_number + 1;
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
      const drawDate = new Date(endDate.getTime() + 60 * 60 * 1000); // +1 hour after end

      const newRoundResult = await client.query(`
        INSERT INTO lambo_lottery_rounds (
          round_number, 
          start_date, 
          end_date, 
          draw_date, 
          prize_pool, 
          status
        ) VALUES ($1, $2, $3, $4, $5, 'active')
        RETURNING *
      `, [nextRoundNumber, startDate, endDate, drawDate, newPrizePool]);

      await client.query('COMMIT');

      return NextResponse.json({ 
        success: true, 
        message: 'Lottery cycle completed successfully',
        completed_round: {
          id: round.id,
          round_number: round.round_number,
          winner_fid: winnerFid,
          winning_number: winningNumber,
          prize_pool: round.prize_pool,
          tickets_sold: ticketsResult.rows.length
        },
        new_round: newRoundResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error completing lottery cycle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete lottery cycle' },
      { status: 500 }
    );
  }
}
