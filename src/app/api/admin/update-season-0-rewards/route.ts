import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Updating Season 0 total_rewards to 10M CHESS...');

    // Update Season 0 total_rewards to 10M CHESS
    const updateResult = await sql`
      UPDATE seasons 
      SET 
        total_rewards = 10000000,
        updated_at = NOW()
      WHERE name = 'Season 0'
      RETURNING id, name, total_rewards, status
    `;

    if (updateResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Season 0 not found'
      }, { status: 404 });
    }

    const season = updateResult[0];
    
    console.log('✅ Season 0 updated successfully!');
    console.log(`📊 Season: ${season.name} (ID: ${season.id})`);
    console.log(`💰 Total Rewards: ${(season.total_rewards / 1e18).toLocaleString()} CHESS`);

    return NextResponse.json({
      success: true,
      message: 'Season 0 total_rewards updated to 10M CHESS',
      season: {
        id: season.id,
        name: season.name,
        total_rewards: season.total_rewards,
        total_rewards_formatted: `${(season.total_rewards / 1e18).toLocaleString()} CHESS`,
        status: season.status
      }
    });

  } catch (error) {
    console.error('❌ Error updating Season 0 rewards:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update Season 0 rewards: ' + (error instanceof Error ? error.message : String(error))
      }, 
      { status: 500 }
    );
  }
}
