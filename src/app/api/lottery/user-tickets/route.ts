import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    if (!fid) {
      return NextResponse.json(
        { success: false, error: 'FID parameter is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Get user's tickets with draw information
      const result = await client.query(`
        SELECT 
          t.id,
          t.number,
          t.created_at,
          d.draw_number,
          d.jackpot,
          d.status as draw_status,
          d.start_time,
          d.end_time
        FROM lottery_tickets t
        JOIN lottery_draws d ON t.draw_id = d.id
        WHERE t.player_fid = $1
        ORDER BY t.created_at DESC
      `, [fid]);

      return NextResponse.json({ 
        success: true, 
        tickets: result.rows,
        total_tickets: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user tickets' },
      { status: 500 }
    );
  }
}