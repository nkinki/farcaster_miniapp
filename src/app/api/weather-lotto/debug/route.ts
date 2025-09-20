import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function GET() {
  try {
    console.log('🔍 Debugging Weather Lotto database...');
    
    const client = await pool.connect();
    
    try {
      // Check if tables exist
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'weather_lotto_%'
        ORDER BY table_name
      `);
      
      // Check weather_lotto_rounds
      const roundsResult = await client.query(`
        SELECT id, round_number, status, house_base, total_pool, created_at
        FROM weather_lotto_rounds 
        ORDER BY round_number DESC
        LIMIT 5
      `);
      
      // Check weather_lotto_stats
      const statsResult = await client.query(`
        SELECT * FROM weather_lotto_stats WHERE id = 1
      `);
      
      // Check weather_lotto_tickets
      const ticketsResult = await client.query(`
        SELECT COUNT(*) as total_tickets FROM weather_lotto_tickets
      `);
      
      return NextResponse.json({
        success: true,
        debug: {
          tables: tablesResult.rows.map(t => t.table_name),
          rounds: roundsResult.rows,
          stats: statsResult.rows[0] || null,
          total_tickets: ticketsResult.rows[0]?.total_tickets || 0
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
