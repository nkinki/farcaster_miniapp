import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating Season 0...');
    
    // Check if Season 0 already exists
    const existingSeason = await client.query(`
      SELECT id FROM seasons WHERE name = 'Season 0 - Under Development'
    `);
    
    if (existingSeason.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Season 0 already exists',
        season_id: existingSeason.rows[0].id
      });
    }
    
    // Create Season 0
    const result = await client.query(`
      INSERT INTO seasons (name, start_date, end_date, total_rewards, status) 
      VALUES (
        'Season 0 - Under Development', 
        NOW(), 
        NOW() + INTERVAL '30 days', 
        1000000, -- 1M CHESS (human readable format)
        'active'
      ) RETURNING id
    `);
    
    const seasonId = result.rows[0].id;
    
    console.log('✅ Season 0 created successfully!');
    console.log('📊 Season ID:', seasonId);
    
    return NextResponse.json({
      success: true,
      message: 'Season 0 created successfully!',
      season_id: seasonId,
      season_name: 'Season 0 - Under Development',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      total_rewards: '1000000',
      status: 'active'
    });

  } catch (error) {
    console.error('❌ Failed to create Season 0:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create Season 0: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
