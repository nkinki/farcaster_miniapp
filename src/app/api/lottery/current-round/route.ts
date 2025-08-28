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
        SELECT * FROM lambo_lottery_rounds 
        WHERE status = 'active' 
        ORDER BY round_number DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        // Create new round if none exists
        const newRoundResult = await client.query(`
          INSERT INTO lambo_lottery_rounds (
            round_number, 
            start_date, 
            end_date, 
            draw_date, 
            prize_pool, 
            status
          ) VALUES (
            COALESCE((SELECT MAX(round_number) FROM lambo_lottery_rounds), 0) + 1,
            NOW(),
            NOW() + INTERVAL '1 day',
            NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
            1000000,
            'active'
          )
          RETURNING *
        `);
        
        return NextResponse.json({ 
          success: true, 
          round: newRoundResult.rows[0] 
        });
      }

      return NextResponse.json({ 
        success: true, 
        round: result.rows[0] 
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