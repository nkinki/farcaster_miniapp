import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');
  const userFid = fid ? parseInt(fid) : 439015; // Default to your FID

  const client = await pool.connect();
  
  try {
    console.log(`🔄 Deleting daily check for user ${userFid}...`);
    
    // Delete today's daily check record
    const result = await client.query(`
      DELETE FROM user_daily_points 
      WHERE user_fid = $1 
      AND date = CURRENT_DATE
    `, [userFid]);
    
    console.log(`✅ Deleted ${result.rowCount} daily check record(s)`);
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${result.rowCount} daily check record(s) for user ${userFid}`,
      user_fid: userFid,
      deleted_count: result.rowCount
    });

  } catch (error) {
    console.error('❌ Error deleting daily check:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error deleting daily check: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
