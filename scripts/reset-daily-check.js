const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetDailyCheck() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Resetting daily check for user 439015...');
    
    // Delete today's daily check record
    const result = await client.query(`
      DELETE FROM user_daily_points 
      WHERE user_fid = 439015 
      AND date = CURRENT_DATE
    `);
    
    console.log(`✅ Deleted ${result.rowCount} daily check record(s)`);
    
    // Also reset the user season summary
    await client.query(`
      UPDATE user_season_summary 
      SET daily_checks = daily_checks - 1,
          total_points = total_points - 1,
          updated_at = NOW()
      WHERE user_fid = 439015 AND season_id = 1
    `);
    
    console.log('✅ Reset user season summary');
    console.log('🎉 Daily check reset complete! You can now test again.');
    
  } catch (error) {
    console.error('❌ Error resetting daily check:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDailyCheck();
