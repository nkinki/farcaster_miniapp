import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating season names...');
    
    // Update Season 1 to Season 0
    const result = await client.query(`
      UPDATE seasons 
      SET name = 'Season 0', updated_at = NOW()
      WHERE name = 'Season 1 - Under Development'
    `);
    
    console.log(`✅ Updated ${result.rowCount} season(s)`);
    
    // Get all seasons to verify
    const seasonsResult = await client.query(`
      SELECT id, name, status FROM seasons ORDER BY created_at DESC
    `);
    
    return NextResponse.json({
      success: true,
      message: `Updated ${result.rowCount} season(s)`,
      seasons: seasonsResult.rows
    });

  } catch (error) {
    console.error('❌ Error updating season names:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update season names: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
