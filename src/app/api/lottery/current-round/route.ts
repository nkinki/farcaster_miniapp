import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      // Get current active round
      const result = await client.query(`
        SELECT * FROM lottery_draws 
        WHERE status = 'active' 
        ORDER BY draw_number DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        // Create new round if none exists
        const newRoundResult = await client.query(`
          INSERT INTO lottery_draws (
            draw_number, 
            start_time, 
            end_time, 
            jackpot, 
            status
          ) VALUES (
            COALESCE((SELECT MAX(draw_number) FROM lottery_draws), 0) + 1,
            NOW(),
            NOW() + INTERVAL '1 day',
            1000000,
            'active'
          )
          RETURNING *
        `);
        
        return NextResponse.json({ 
          success: true, 
          round: {
            id: newRoundResult.rows[0].id,
            round_number: newRoundResult.rows[0].draw_number,
            start_date: newRoundResult.rows[0].start_time,
            end_date: newRoundResult.rows[0].end_time,
            draw_date: newRoundResult.rows[0].end_time,
            prize_pool: newRoundResult.rows[0].jackpot,
            status: newRoundResult.rows[0].status,
            winner_fid: null,
            winner_number: newRoundResult.rows[0].winning_number,
            total_tickets_sold: newRoundResult.rows[0].total_tickets
          }
        });
      }

      return NextResponse.json({ 
        success: true, 
        round: {
          id: result.rows[0].id,
          round_number: result.rows[0].draw_number,
          start_date: result.rows[0].start_time,
          end_date: result.rows[0].end_time,
          draw_date: result.rows[0].end_time,
          prize_pool: result.rows[0].jackpot,
          status: result.rows[0].status,
          winner_fid: null,
          winner_number: result.rows[0].winning_number,
          total_tickets_sold: result.rows[0].total_tickets
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching current round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch current round' },
      { status: 500 }
    );
  }
}