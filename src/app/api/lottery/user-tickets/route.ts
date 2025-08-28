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
        { success: false, error: 'FID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Get current active round
      const roundResult = await client.query(`
        SELECT id FROM lambo_lottery_rounds 
        WHERE status = 'active' 
        ORDER BY round_number DESC 
        LIMIT 1
      `);

      if (roundResult.rows.length === 0) {
        return NextResponse.json({ 
          success: true, 
          tickets: [] 
        });
      }

      const roundId = roundResult.rows[0].id;

      // Get user's tickets for current round
      const ticketsResult = await client.query(`
        SELECT * FROM lambo_lottery_tickets 
        WHERE round_id = $1 AND fid = $2
        ORDER BY ticket_number ASC
      `, [roundId, parseInt(fid)]);

      return NextResponse.json({ 
        success: true, 
        tickets: ticketsResult.rows 
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