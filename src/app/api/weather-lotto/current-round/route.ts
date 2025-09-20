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
        SELECT * FROM weather_lotto_rounds 
        WHERE status = 'active' 
        ORDER BY round_number DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        // Create new round if none exists
        const newRoundResult = await client.query(`
          INSERT INTO weather_lotto_rounds (
            round_number, 
            start_time, 
            end_time, 
            status,
            house_base,
            total_pool
          ) VALUES (
            COALESCE((SELECT MAX(round_number) FROM weather_lotto_rounds), 0) + 1,
            NOW(),
            NOW() + INTERVAL '1 day',
            'active',
            200000000000000000000000,
            200000000000000000000000
          )
          RETURNING *
        `);
        
        const newRound = newRoundResult.rows[0];
        
        // Return the new round with calculated values
        return NextResponse.json({
          success: true,
          round: {
            ...newRound,
            sunny_tickets: 0,
            rainy_tickets: 0,
            total_tickets: 0,
            current_total_pool: "200000000000000000000000",
            winners_pool: "140000000000000000000000", // 70% of 200k
            treasury_amount: "60000000000000000000000", // 30% of 200k
            time_remaining: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
            sunny_odds: "0",
            rainy_odds: "0"
          }
        });
      }

      const round = result.rows[0];
      
      if (!round || !round.id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid round data' 
        }, { status: 500 });
      }
      
      // Calculate time remaining
      const now = new Date();
      const endTime = new Date(round.end_time);
      const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());
      
      // Get current ticket counts
      const ticketCounts = await client.query(`
        SELECT 
          side,
          SUM(quantity) as total_quantity
        FROM weather_lotto_tickets 
        WHERE round_id = $1
        GROUP BY side
      `, [round.id]);

      let sunnyTickets = 0;
      let rainyTickets = 0;
      
      ticketCounts.rows.forEach(row => {
        if (row.side === 'sunny') {
          sunnyTickets = parseInt(row.total_quantity) || 0;
        } else if (row.side === 'rainy') {
          rainyTickets = parseInt(row.total_quantity) || 0;
        }
      });

      // Calculate current pools
      const totalTickets = sunnyTickets + rainyTickets;
      const ticketPrice = BigInt(100000000000000000000000); // 100k CHESS per ticket
      const playerPool = BigInt(totalTickets) * ticketPrice;
      const houseBase = BigInt(200000000000000000000000); // 200k CHESS house base
      const currentTotalPool = houseBase + playerPool;
      const winnersPool = (currentTotalPool * BigInt(70)) / BigInt(100); // 70% winners
      const treasuryPool = currentTotalPool - winnersPool; // 30% treasury

      // Calculate odds (avoid Number conversion for very large BigInts)
      const sunnyOdds = sunnyTickets > 0 ? winnersPool / BigInt(sunnyTickets) : BigInt(0);
      const rainyOdds = rainyTickets > 0 ? winnersPool / BigInt(rainyTickets) : BigInt(0);

      return NextResponse.json({
        success: true,
        round: {
          ...round,
          sunny_tickets: sunnyTickets,
          rainy_tickets: rainyTickets,
          total_tickets: totalTickets,
          current_total_pool: currentTotalPool.toString(),
          winners_pool: winnersPool.toString(),
          treasury_amount: treasuryPool.toString(),
          time_remaining: timeRemaining,
          sunny_odds: sunnyOdds.toString(),
          rainy_odds: rainyOdds.toString()
        }
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching current weather lotto round:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch current round' },
      { status: 500 }
    );
  }
}
