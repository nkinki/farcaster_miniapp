import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  const client = await pool.connect();
  
  try {
    // Get current active season
    const result = await client.query(`
      SELECT * FROM seasons 
      WHERE status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active season found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      season: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching current season:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch season data' 
    }, { status: 500 });
  } finally {
    client.release();
  }
}
