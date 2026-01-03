import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL || 'postgresql://test:test@localhost:5432/test',
});

// Base jackpot defined as a constant
const BASE_JACKPOT = 1000000;

export async function POST(request: NextRequest) {
  try {
    const { action, testFid = 12345 } = await request.json();
    const client = await pool.connect();

    try {
      if (action === 'reset') {
        await client.query('BEGIN');
        await client.query('DELETE FROM lottery_tickets');
        await client.query('DELETE FROM lottery_draws');
        await client.query('DELETE FROM lottery_stats');

        // FIX: Creating statistics with 1M base jackpot
        await client.query(`
          INSERT INTO lottery_stats (id, total_tickets, active_tickets, total_jackpot, next_draw_time, last_draw_number)
          VALUES (1, 0, 0, $1, NOW() + INTERVAL '1 day', 0)
        `, [BASE_JACKPOT]);

        // FIX: Creating first draw round with 1M base jackpot
        await client.query(`
            INSERT INTO lottery_draws (
              draw_number, start_time, end_time, jackpot, status
            ) VALUES (
              1, NOW(), NOW() + INTERVAL '1 day', $1, 'active'
            )
          `, [BASE_JACKPOT]);

        await client.query('COMMIT');

        return NextResponse.json({
          success: true,
          message: `Lottery data reset successfully. Round 1 starts with a jackpot of ${BASE_JACKPOT}.`
        });
      }

      if (action === 'simulate_new_round') {
        const lastRoundResult = await client.query(`
          SELECT * FROM lottery_draws 
          WHERE status = 'completed' 
          ORDER BY draw_number DESC LIMIT 1
        `);

        if (lastRoundResult.rows.length === 0) {
          throw new Error('No completed round found to start a new one from. Run simulate_draw first.');
        }

        const lastRound = lastRoundResult.rows[0];
        let newJackpot;

        const winnerResult = await client.query(`
            SELECT id FROM lottery_tickets 
            WHERE draw_id = $1 AND number = $2
        `, [lastRound.id, lastRound.winning_number]);

        const hasWinner = winnerResult.rows.length > 0;

        if (hasWinner) {
          newJackpot = BASE_JACKPOT;
        } else {
          const lastRoundTickets = lastRound.total_tickets || 0;
          const ticketRevenue = lastRoundTickets * 100000;
          const carryOverAmount = Math.floor(ticketRevenue * 0.7);

          // FIX: Using `parseInt` for correct mathematical addition
          const lastJackpot = parseInt(lastRound.jackpot || '0', 10);
          newJackpot = lastJackpot + carryOverAmount;
        }

        const nextDrawNumber = lastRound.draw_number + 1;

        const existingDraw = await client.query(`SELECT id FROM lottery_draws WHERE draw_number = $1`, [nextDrawNumber]);
        if (existingDraw.rows.length > 0) {
          throw new Error(`Draw number ${nextDrawNumber} already exists. Cannot create a new round.`);
        }

        const newRoundResult = await client.query(`
          INSERT INTO lottery_draws (
            draw_number, start_time, end_time, jackpot, status
          ) VALUES ($1, NOW(), NOW() + INTERVAL '1 day', $2, 'active')
          RETURNING *
        `, [nextDrawNumber, newJackpot]);

        return NextResponse.json({
          success: true,
          message: 'New round created successfully with correct jackpot logic.',
          new_round: newRoundResult.rows[0]
        });
      }

      // ... (Rest of 'if' blocks would go here if needed)

      return NextResponse.json({
        success: false,
        error: 'Invalid or unhandled action. Use: reset, simulate_new_round, etc.'
      }, { status: 400 });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in test simulation:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: `Test simulation failed: ${errorMessage}` }, { status: 500 });
  }
}