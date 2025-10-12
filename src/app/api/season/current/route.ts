import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  const client = await pool.connect();
  
  try {
    // Get all seasons
    const seasonsResult = await client.query(`
      SELECT id, name, start_date, end_date, total_rewards, status, created_at
      FROM seasons 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      seasons: seasonsResult.rows
    });

  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch seasons' 
    }, { status: 500 });
  } finally {
    client.release();
  }
}