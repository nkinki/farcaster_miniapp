import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding reward_claimed column to follow_actions table...');
    
    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'follow_actions' 
      AND column_name = 'reward_claimed'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ reward_claimed column already exists in follow_actions table');
      return NextResponse.json({
        success: true,
        message: 'reward_claimed column already exists in follow_actions table',
        alreadyExists: true
      });
    }
    
    // Add reward_claimed column
    await client.query(`
      ALTER TABLE follow_actions 
      ADD COLUMN reward_claimed BOOLEAN DEFAULT FALSE
    `);
    
    console.log('✅ reward_claimed column added to follow_actions table');
    
    // Update existing records to have reward_claimed = false
    await client.query(`
      UPDATE follow_actions 
      SET reward_claimed = FALSE 
      WHERE reward_claimed IS NULL
    `);
    
    console.log('✅ Updated existing follow_actions records with reward_claimed = FALSE');
    
    return NextResponse.json({
      success: true,
      message: 'reward_claimed column added to follow_actions table successfully',
      alreadyExists: false
    });
    
  } catch (error) {
    console.error('❌ Error adding reward_claimed column:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add reward_claimed column',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
