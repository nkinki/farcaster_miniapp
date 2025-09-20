import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerFid = searchParams.get('fid');
    const roundId = searchParams.get('round_id');

    if (!playerFid) {
      return NextResponse.json(
        { success: false, error: 'Player FID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          t.*,
          r.round_number,
          r.status as round_status,
          r.winning_side,
          r.end_time
        FROM weather_lotto_tickets t
        JOIN weather_lotto_rounds r ON t.round_id = r.id
        WHERE t.player_fid = $1
      `;
      
      const params = [playerFid];
      
      if (roundId) {
        query += ` AND t.round_id = $2`;
        params.push(roundId);
      }
      
      query += ` ORDER BY t.created_at DESC`;

      const result = await client.query(query, params);

      // Get user's total statistics
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total_tickets,
          SUM(quantity) as total_quantity,
          SUM(total_cost) as total_spent,
          SUM(CASE WHEN side = 'sunny' THEN quantity ELSE 0 END) as sunny_tickets,
          SUM(CASE WHEN side = 'rainy' THEN quantity ELSE 0 END) as rainy_tickets,
          SUM(CASE WHEN r.winning_side = t.side AND r.status = 'completed' THEN t.payout_amount ELSE 0 END) as total_winnings
        FROM weather_lotto_tickets t
        JOIN weather_lotto_rounds r ON t.round_id = r.id
        WHERE t.player_fid = $1
      `, [playerFid]);

      const stats = statsResult.rows[0] || {
        total_tickets: 0,
        total_quantity: 0,
        total_spent: 0,
        sunny_tickets: 0,
        rainy_tickets: 0,
        total_winnings: 0
      };

      // Get pending claims
      const claimsResult = await client.query(`
        SELECT 
          c.*,
          r.round_number
        FROM weather_lotto_claims c
        JOIN weather_lotto_rounds r ON c.round_id = r.id
        WHERE c.player_fid = $1 AND c.status = 'pending'
        ORDER BY c.created_at DESC
      `, [playerFid]);

      return NextResponse.json({
        success: true,
        tickets: result.rows,
        stats: {
          total_tickets: parseInt(stats.total_tickets) || 0,
          total_quantity: parseInt(stats.total_quantity) || 0,
          total_spent: stats.total_spent ? BigInt(stats.total_spent).toString() : "0",
          sunny_tickets: parseInt(stats.sunny_tickets) || 0,
          rainy_tickets: parseInt(stats.rainy_tickets) || 0,
          total_winnings: stats.total_winnings ? BigInt(stats.total_winnings).toString() : "0"
        },
        pending_claims: claimsResult.rows
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching user weather lotto tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user tickets' },
      { status: 500 }
    );
  }
}
