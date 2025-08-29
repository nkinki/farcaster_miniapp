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

      // Get the last completed round to calculate new prize pool
      const lastRoundResult = await client.query(`
        SELECT * FROM lambo_lottery_rounds 
        WHERE status = 'completed' 
        ORDER BY round_number DESC 
        LIMIT 1
      `);

      let newPrizePool = 1000000; // Default 1M CHESS tokens

      if (lastRoundResult.rows.length > 0) {
        const lastRound = lastRoundResult.rows[0];
        
        // Calculate new prize pool: 70% of ticket sales from last round
        const lastRoundTickets = lastRound.total_tickets_sold || 0;
        const ticketRevenue = lastRoundTickets * 20000; // 20,000 CHESS per ticket
        const carryOverAmount = Math.floor(ticketRevenue * 0.7);
        
        newPrizePool = 1000000 + carryOverAmount; // Base 1M + carryover
      }

      // Get next round number
      const nextRoundResult = await client.query(`
        SELECT COALESCE(MAX(round_number), 0) + 1 as next_round 
        FROM lambo_lottery_rounds
      `);
      
      const nextRoundNumber = nextRoundResult.rows[0].next_round;

      // Calculate new round dates
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
      const drawDate = new Date(endDate.getTime() + 60 * 60 * 1000); // +1 hour after end

      // Create new round
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
        message: 'New round created successfully',
        round: newRoundResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating new round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create new round' },
      { status: 500 }
    );
  }
}
