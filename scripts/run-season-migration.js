const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runSeasonMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Season migration...');
    
    // Read the SQL file
    const sql = fs.readFileSync('scripts/create-season-tables.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await client.query(statement);
      }
    }
    
    console.log('✅ Season migration completed successfully!');
    console.log('📊 Created tables:');
    console.log('  - seasons');
    console.log('  - user_daily_points');
    console.log('  - point_transactions');
    console.log('  - airdrop_claims');
    console.log('  - user_season_summary');
    console.log('  - Season 1 inserted');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runSeasonMigration()
    .then(() => {
      console.log('🎉 Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = runSeasonMigration;
