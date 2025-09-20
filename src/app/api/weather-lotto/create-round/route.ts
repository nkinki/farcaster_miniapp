import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Creating new Weather Lotto round...');
    
    const client = await pool.connect();
    
    try {
      // Check if there's already an active round
      const existingRound = await client.query(
        'SELECT * FROM weather_lotto_rounds WHERE status = $1',
        ['active']
      );
      
      if (existingRound.rows.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Active round already exists',
          round: existingRound.rows[0]
        }, { status: 400 });
      }
      
      // Get next round number
      const maxRoundResult = await client.query(
        'SELECT MAX(round_number) as max_round FROM weather_lotto_rounds'
      );
      
      const nextRoundNumber = (maxRoundResult.rows[0]?.max_round || 0) + 1;
      
      // Create new round
      const newRoundResult = await client.query(`
        INSERT INTO weather_lotto_rounds (
          round_number, 
          start_time, 
          end_time, 
          status,
          house_base,
          total_pool
        ) VALUES (
          $1,
          NOW(),
          NOW() + INTERVAL '1 day',
          'active',
          200000000000000000000000,
          200000000000000000000000
        )
        RETURNING *
      `, [nextRoundNumber]);
      
      const newRound = newRoundResult.rows[0];
      
      // Update stats
      await client.query(`
        UPDATE weather_lotto_stats 
        SET 
          active_round_id = $1,
          next_draw_time = $2,
          current_total_pool = 200000000000000000000000,
          current_sunny_tickets = 0,
          current_rainy_tickets = 0
        WHERE id = 1
      `, [newRound.id, newRound.end_time]);
      
      console.log('✅ New Weather Lotto round created:', newRound.round_number);
      
      return NextResponse.json({ 
        success: true, 
        message: 'New round created successfully',
        round: newRound
      });
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('❌ Error creating Weather Lotto round:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
