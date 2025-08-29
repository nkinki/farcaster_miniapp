import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      // Get lottery stats
      const result = await client.query(`
        SELECT * FROM lottery_stats 
        ORDER BY id DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        // Create initial stats if none exists
        const newStatsResult = await client.query(`
          INSERT INTO lottery_stats (
            total_tickets, 
            active_tickets, 
            total_jackpot, 
            next_draw_time
          ) VALUES (
            0, 0, 1000000, NOW() + INTERVAL '1 day'
          )
          RETURNING *
        `);
        
        return NextResponse.json({ 
          success: true, 
          stats: {
            total_rounds: 0,
            total_tickets_sold: newStatsResult.rows[0].total_tickets,
            total_prize_distributed: 0,
            treasury_balance: newStatsResult.rows[0].total_jackpot
          }
        });
      }

      const stats = result.rows[0];
      
      return NextResponse.json({ 
        success: true, 
        stats: {
          total_rounds: stats.last_draw_number,
          total_tickets_sold: stats.total_tickets,
          total_prize_distributed: 0, // Will be calculated from completed draws
          treasury_balance: stats.total_jackpot
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching lottery stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lottery stats' },
      { status: 500 }
    );
  }
}