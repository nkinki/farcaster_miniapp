const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetAllSeasonData() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Resetting ALL season data...');
    
    await client.query('BEGIN');

    // Delete all season-related data
    const results = await Promise.all([
      client.query('DELETE FROM user_daily_points'),
      client.query('DELETE FROM user_season_summary'),
      client.query('DELETE FROM point_transactions'),
      client.query('DELETE FROM airdrop_claims')
    ]);

    console.log('✅ Deleted records:');
    console.log(`  - user_daily_points: ${results[0].rowCount}`);
    console.log(`  - user_season_summary: ${results[1].rowCount}`);
    console.log(`  - point_transactions: ${results[2].rowCount}`);
    console.log(`  - airdrop_claims: ${results[3].rowCount}`);

    await client.query('COMMIT');
    
    console.log('🎉 All season data reset successfully!');
    console.log('📊 You can now test with a clean slate.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error resetting season data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  resetAllSeasonData()
    .then(() => {
      console.log('✅ Reset completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Reset failed:', error);
      process.exit(1);
    });
}

module.exports = resetAllSeasonData;
