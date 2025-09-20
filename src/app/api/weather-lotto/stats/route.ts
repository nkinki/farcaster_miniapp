import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      // Get overall stats
      const statsResult = await client.query(`
        SELECT * FROM weather_lotto_stats WHERE id = 1
      `);

      const stats = statsResult.rows[0] || {
        total_rounds: 0,
        total_tickets_sold: 0,
        total_volume: 0,
        total_treasury: 0,
        total_payouts: 0,
        current_sunny_tickets: 0,
        current_rainy_tickets: 0,
        current_total_pool: 200000000000000000000000
      };

      // Get recent rounds
      const recentRoundsResult = await client.query(`
        SELECT 
          id,
          round_number,
          start_time,
          end_time,
          status,
          winning_side,
          sunny_tickets,
          rainy_tickets,
          total_tickets,
          total_pool,
          winners_pool,
          treasury_amount
        FROM weather_lotto_rounds 
        ORDER BY round_number DESC 
        LIMIT 10
      `);

      // Get top players by volume
      const topPlayersResult = await client.query(`
        SELECT 
          player_fid,
          player_name,
          player_address,
          COUNT(*) as total_rounds_played,
          SUM(quantity) as total_tickets,
          SUM(total_cost) as total_volume,
          SUM(CASE WHEN r.winning_side = t.side AND r.status = 'completed' THEN t.payout_amount ELSE 0 END) as total_winnings
        FROM weather_lotto_tickets t
        JOIN weather_lotto_rounds r ON t.round_id = r.id
        GROUP BY player_fid, player_name, player_address
        ORDER BY total_volume DESC
        LIMIT 10
      `);

      // Get side preferences
      const sideStatsResult = await client.query(`
        SELECT 
          side,
          COUNT(*) as total_purchases,
          SUM(quantity) as total_tickets,
          SUM(total_cost) as total_volume,
          AVG(quantity) as avg_quantity_per_purchase
        FROM weather_lotto_tickets
        GROUP BY side
        ORDER BY total_volume DESC
      `);

      // Get daily volume (last 7 days)
      const dailyVolumeResult = await client.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as purchases,
          SUM(quantity) as tickets,
          SUM(total_cost) as volume
        FROM weather_lotto_tickets
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      // Get pending claims
      const pendingClaimsResult = await client.query(`
        SELECT 
          COUNT(*) as total_claims,
          SUM(total_payout) as total_pending_amount
        FROM weather_lotto_claims
        WHERE status = 'pending'
      `);

      const pendingClaims = pendingClaimsResult.rows[0] || {
        total_claims: 0,
        total_pending_amount: 0
      };

      return NextResponse.json({
        success: true,
        stats: {
          total_rounds: parseInt(stats.total_rounds) || 0,
          total_tickets_sold: parseInt(stats.total_tickets_sold) || 0,
          total_volume: stats.total_volume ? BigInt(stats.total_volume).toString() : "0",
          total_treasury: stats.total_treasury ? BigInt(stats.total_treasury).toString() : "0",
          total_payouts: stats.total_payouts ? BigInt(stats.total_payouts).toString() : "0",
          current_sunny_tickets: parseInt(stats.current_sunny_tickets) || 0,
          current_rainy_tickets: parseInt(stats.current_rainy_tickets) || 0,
          current_total_pool: stats.current_total_pool ? BigInt(stats.current_total_pool).toString() : "200000000000000000000000",
          pending_claims: parseInt(pendingClaims.total_claims) || 0,
          pending_amount: pendingClaims.total_pending_amount ? BigInt(pendingClaims.total_pending_amount).toString() : "0"
        },
        recent_rounds: recentRoundsResult.rows,
        top_players: topPlayersResult.rows.map(player => ({
          ...player,
          total_volume: player.total_volume ? BigInt(player.total_volume).toString() : "0",
          total_winnings: player.total_winnings ? BigInt(player.total_winnings).toString() : "0"
        })),
        side_stats: sideStatsResult.rows.map(side => ({
          ...side,
          total_volume: side.total_volume ? BigInt(side.total_volume).toString() : "0"
        })),
        daily_volume: dailyVolumeResult.rows.map(day => ({
          ...day,
          volume: day.volume ? BigInt(day.volume).toString() : "0"
        }))
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching weather lotto stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
