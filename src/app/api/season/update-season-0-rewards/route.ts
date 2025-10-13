import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { total_rewards } = await request.json();
    
    console.log(`🔄 Updating Season 0 total_rewards to ${total_rewards} CHESS`);
    
    // Update Season 0 total_rewards
    const result = await client.query(`
      UPDATE seasons 
      SET total_rewards = $1, updated_at = NOW()
      WHERE name = 'Season 0'
      RETURNING id, name, total_rewards
    `, [total_rewards]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Season 0 not found'
      }, { status: 404 });
    }
    
    const updatedSeason = result.rows[0];
    
    console.log('✅ Season 0 updated successfully!');
    console.log('📊 New total_rewards:', updatedSeason.total_rewards);
    
    return NextResponse.json({
      success: true,
      message: 'Season 0 total_rewards updated successfully!',
      season: updatedSeason
    });

  } catch (error) {
    console.error('❌ Failed to update Season 0:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update Season 0: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
