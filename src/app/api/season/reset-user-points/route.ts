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

    console.log(`🔄 Resetting ALL points for user ${user_fid}...`);
    
    await client.query('BEGIN');

    // 1. Delete from user_daily_points
    const dailyPointsResult = await client.query(`
      DELETE FROM user_daily_points 
      WHERE user_fid = $1
    `, [user_fid]);
    console.log(`✅ Deleted ${dailyPointsResult.rowCount} daily points records`);

    // 2. Delete from user_season_summary
    const seasonSummaryResult = await client.query(`
      DELETE FROM user_season_summary 
      WHERE user_fid = $1
    `, [user_fid]);
    console.log(`✅ Deleted ${seasonSummaryResult.rowCount} season summary records`);

    // 3. Delete from point_transactions
    const transactionsResult = await client.query(`
      DELETE FROM point_transactions 
      WHERE user_fid = $1
    `, [user_fid]);
    console.log(`✅ Deleted ${transactionsResult.rowCount} point transactions`);

    // 4. Delete from airdrop_claims
    const claimsResult = await client.query(`
      DELETE FROM airdrop_claims 
      WHERE user_fid = $1
    `, [user_fid]);
    console.log(`✅ Deleted ${claimsResult.rowCount} airdrop claims`);

    await client.query('COMMIT');

    console.log(`🎉 Successfully reset ALL points for user ${user_fid}`);

    return NextResponse.json({
      success: true,
      message: `Successfully reset ALL points for user ${user_fid}`,
      deleted_records: {
        daily_points: dailyPointsResult.rowCount,
        season_summary: seasonSummaryResult.rowCount,
        transactions: transactionsResult.rowCount,
        claims: claimsResult.rowCount
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error resetting user points:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error resetting user points: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  } finally {
    client.release();
  }
}
