import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { 
      name, 
      durationDays = 30, 
      totalRewards = 10000000, // 10M CHESS default
      status = 'active' 
    } = await request.json();
    
    console.log(`🚀 Creating new season: ${name || 'Auto-generated'}...`);
    
    // Generate season name if not provided
    let seasonName = name;
    if (!seasonName) {
      const nextSeasonResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(name FROM 'Season (\\d+)') AS INTEGER)), 0) + 1 as next_number
        FROM seasons
        WHERE name ~ '^Season \\d+$'
      `);
      
      const nextSeasonNumber = nextSeasonResult.rows[0].next_number;
      seasonName = `Season ${nextSeasonNumber}`;
    }
    
    // Check if season name already exists
    const existingSeason = await client.query(`
      SELECT id FROM seasons WHERE name = $1
    `, [seasonName]);
    
    if (existingSeason.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Season "${seasonName}" already exists`
      }, { status: 400 });
    }
    
    // Create new season
    const result = await client.query(`
      INSERT INTO seasons (name, start_date, end_date, total_rewards, status) 
      VALUES (
        $1, 
        NOW(), 
        NOW() + INTERVAL '${durationDays} days', 
        $2, -- total_rewards
        $3
      ) RETURNING id, name, start_date, end_date, total_rewards, status, created_at
    `, [seasonName, totalRewards, status]);
    
    const newSeason = result.rows[0];
    
    console.log(`✅ New season created successfully!`);
    console.log(`📊 Season: ${newSeason.name} (ID: ${newSeason.id})`);
    console.log(`💰 Total Rewards: ${parseInt(newSeason.total_rewards).toLocaleString()} CHESS`);
    console.log(`📅 Duration: ${durationDays} days`);
    
    return NextResponse.json({
      success: true,
      message: 'New season created successfully!',
      season: newSeason
    });

  } catch (error) {
    console.error('❌ Failed to create new season:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create new season: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
