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
        SELECT * FROM lambo_lottery_stats 
        WHERE id = 1
      `);

      if (result.rows.length === 0) {
        // Create initial stats if not exists
        await client.query(`
          INSERT INTO lambo_lottery_stats (id, total_rounds, total_tickets_sold, total_prize_distributed, treasury_balance)
          VALUES (1, 0, 0, 0, 0)
        `);
        
        return NextResponse.json({ 
          success: true, 
          stats: {
            total_rounds: 0,
            total_tickets_sold: 0,
            total_prize_distributed: 0,
            treasury_balance: 0
          }
        });
      }

      return NextResponse.json({ 
        success: true, 
        stats: result.rows[0] 
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