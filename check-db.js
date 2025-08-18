const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking promotions table...');
    
    // Check the latest promotions with action_type
    const promotionsResult = await pool.query(`
      SELECT id, username, cast_url, action_type, created_at 
      FROM promotions 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    const promotions = promotionsResult.rows;
    console.log('📊 Latest 5 promotions:');
    promotions.forEach((promo, index) => {
      console.log(`${index + 1}. ID: ${promo.id}, User: ${promo.username}, Action: ${promo.action_type || 'NULL'}, Created: ${promo.created_at}`);
    });
    
    // Check action_type distribution
    const actionTypeStatsResult = await pool.query(`
      SELECT action_type, COUNT(*) as count 
      FROM promotions 
      GROUP BY action_type
    `);
    
    const actionTypeStats = actionTypeStatsResult.rows;
    console.log('\n📈 Action type distribution:');
    actionTypeStats.forEach(stat => {
      console.log(`${stat.action_type || 'NULL'}: ${stat.count} promotions`);
    });
    
    // Check if like_recast_actions table exists
    try {
      const tableCheckResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'like_recast_actions'
        );
      `);
      
      const tableExists = tableCheckResult.rows[0].exists;
      console.log(`\n📋 like_recast_actions table exists: ${tableExists}`);
      
      if (tableExists) {
        const actionsResult = await pool.query(`
          SELECT COUNT(*) as count FROM like_recast_actions
        `);
        console.log(`📊 Total like/recast actions: ${actionsResult.rows[0].count}`);
      }
    } catch (tableError) {
      console.log('\n📋 like_recast_actions table: Not found');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();