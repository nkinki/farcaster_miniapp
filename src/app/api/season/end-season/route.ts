import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { seasonId, createNewSeason = true } = await request.json();
    
    if (!seasonId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Season ID is required' 
      }, { status: 400 });
    }

    console.log(`🏁 Ending Season ${seasonId}...`);
    
    // Get season info
    const seasonResult = await client.query(`
      SELECT id, name, total_rewards, status FROM seasons WHERE id = $1
    `, [seasonId]);

    if (seasonResult.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Season not found' 
      }, { status: 404 });
    }

    const season = seasonResult.rows[0];
    
    if (season.status === 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Season is already completed' 
      }, { status: 400 });
    }

    // Calculate airdrop distribution based on points (but don't distribute yet)
    console.log(`ℹ️ Season ${seasonId} ended. Airdrop distribution calculated based on points - ready for manual distribution.`);
    
    // Calculate the distribution for reference
    try {
      const calculateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://farc-nu.vercel.app'}/api/season/calculate-airdrop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          seasonId, 
          totalRewardAmount: parseInt(season.total_rewards) * 1000000000000000000 
        })
      });
      
      if (calculateResponse.ok) {
        const calculateData = await calculateResponse.json();
        console.log(`📊 Airdrop distribution calculated: ${calculateData.total_users} users, ${calculateData.total_points} total points`);
      }
    } catch (error) {
      console.error('Failed to calculate airdrop distribution:', error);
    }

    // Mark season as completed
    await client.query(`
      UPDATE seasons 
      SET status = 'completed', updated_at = NOW() 
      WHERE id = $1
    `, [seasonId]);

    console.log(`✅ Season ${seasonId} marked as completed`);

    let newSeasonResult = null;
    
    // Create new season if requested
    if (createNewSeason) {
      console.log(`🚀 Creating new season...`);
      
      // Get the next season number
      const nextSeasonResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(name FROM 'Season (\\d+)') AS INTEGER)), 0) + 1 as next_number
        FROM seasons
        WHERE name ~ '^Season \\d+$'
      `);
      
      const nextSeasonNumber = nextSeasonResult.rows[0].next_number;
      const newSeasonName = `Season ${nextSeasonNumber}`;
      
      // Create new season with 10M CHESS default
      const newSeasonQuery = await client.query(`
        INSERT INTO seasons (name, start_date, end_date, total_rewards, status) 
        VALUES (
          $1, 
          NOW(), 
          NOW() + INTERVAL '30 days', 
          10000000, -- 10M CHESS (human readable format)
          'active'
        ) RETURNING id, name, total_rewards, status
      `, [newSeasonName]);
      
      newSeasonResult = newSeasonQuery.rows[0];
      console.log(`✅ New season created: ${newSeasonName} (ID: ${newSeasonResult.id})`);
    }

    return NextResponse.json({
      success: true,
      message: 'Season ended successfully. Airdrop distribution calculated based on points - ready for manual distribution.',
      ended_season: {
        id: season.id,
        name: season.name,
        status: 'completed'
      },
      new_season: newSeasonResult,
      note: 'Airdrop distribution calculated based on user points - administrators can now distribute rewards when ready'
    });

  } catch (error) {
    console.error('❌ Failed to end season:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to end season: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
