import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const { user_fid } = await request.json();
    
    if (!user_fid) {
      return NextResponse.json({ 
        success: false, 
        error: 'User FID is required' 
      }, { status: 400 });
    }

    console.log(`🔄 Resetting daily check for user ${user_fid}...`);
    
    // Delete today's daily check record
    const deleteResult = await client.query(`
      DELETE FROM user_daily_points 
      WHERE user_fid = $1 
      AND date = CURRENT_DATE
    `, [user_fid]);
    
    console.log(`✅ Deleted ${deleteResult.rowCount} daily check record(s)`);
    
    // Also reset the user season summary
    const updateResult = await client.query(`
      UPDATE user_season_summary 
      SET daily_checks = GREATEST(daily_checks - 1, 0),
          total_points = GREATEST(total_points - 1, 0),
          updated_at = NOW()
      WHERE user_fid = $1 AND season_id = 1
    `, [user_fid]);
    
    console.log(`✅ Updated ${updateResult.rowCount} user season summary record(s)`);
    
    return NextResponse.json({
      success: true,
      message: 'Daily check reset successfully',
      deleted_records: deleteResult.rowCount,
      updated_records: updateResult.rowCount
    });

  } catch (error) {
    console.error('❌ Error resetting daily check:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error resetting daily check: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
