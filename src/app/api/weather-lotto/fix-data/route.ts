import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST() {
  try {
    console.log('🔧 Starting Weather Lotto data fix...');
    
    const client = await pool.connect();
    
    try {
      // Update existing weather_lotto_rounds to use correct values
      const roundsUpdate = await client.query(`
        UPDATE weather_lotto_rounds 
        SET 
          house_base = 200000000000000000000000,  -- 200k CHESS
          total_pool = 200000000000000000000000   -- 200k CHESS
        WHERE house_base != 200000000000000000000000
        RETURNING id, round_number
      `);
      
      // Update existing weather_lotto_stats to use correct values
      const statsUpdate = await client.query(`
        UPDATE weather_lotto_stats 
        SET 
          current_total_pool = 200000000000000000000000,  -- 200k CHESS
          total_volume = 0,             -- Reset to 0
          total_treasury = 0,           -- Reset to 0
          total_payouts = 0             -- Reset to 0
        WHERE current_total_pool != 200000000000000000000000
        RETURNING id
      `);
      
      // Update existing weather_lotto_tickets to use correct values
      const ticketsUpdate = await client.query(`
        UPDATE weather_lotto_tickets 
        SET 
          total_cost = 100000000000000000000000,  -- 100k CHESS per ticket
          payout_amount = 0  -- Reset to 0
        WHERE total_cost != 100000000000000000000000
        RETURNING id
      `);
      
      // Update existing weather_lotto_claims to use correct values
      const claimsUpdate = await client.query(`
        UPDATE weather_lotto_claims 
        SET 
          total_payout = 0  -- Reset to 0
        WHERE total_payout != 0
        RETURNING id
      `);
      
      // Create a new active round with proper values if none exists
      const newRoundResult = await client.query(`
        INSERT INTO weather_lotto_rounds (
          round_number, 
          start_time, 
          end_time, 
          status,
          house_base,
          total_pool
        ) 
        SELECT 
          COALESCE((SELECT MAX(round_number) FROM weather_lotto_rounds), 0) + 1,
          NOW(),
          NOW() + INTERVAL '1 day',
          'active',
          200000000000000000000000,  -- 200k CHESS
          200000000000000000000000   -- 200k CHESS
        WHERE NOT EXISTS (
          SELECT 1 FROM weather_lotto_rounds WHERE status = 'active'
        )
        RETURNING id, round_number
      `);
      
      // Update stats with new round
      const statsUpdate2 = await client.query(`
        UPDATE weather_lotto_stats 
        SET 
          active_round_id = (SELECT id FROM weather_lotto_rounds WHERE status = 'active' LIMIT 1),
          next_draw_time = (SELECT end_time FROM weather_lotto_rounds WHERE status = 'active' LIMIT 1),
          current_total_pool = 200000000000000000000000,
          current_sunny_tickets = 0,
          current_rainy_tickets = 0
        WHERE id = 1
        RETURNING id
      `);
      
      client.release();
      
      console.log('✅ Weather Lotto data fix completed successfully!');
      
      return NextResponse.json({
        success: true,
        message: 'Weather Lotto data fixed successfully',
        updates: {
          rounds_updated: roundsUpdate.rows.length,
          stats_updated: statsUpdate.rows.length,
          tickets_updated: ticketsUpdate.rows.length,
          claims_updated: claimsUpdate.rows.length,
          new_rounds_created: newRoundResult.rows.length,
          stats_updated_2: statsUpdate2.rows.length
        }
      });
      
    } catch (error: any) {
      client.release();
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Weather Lotto data fix failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
