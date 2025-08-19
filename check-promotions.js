const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPromotions() {
  try {
    console.log('🔍 Checking promotions table...');
    
    // Check what promotion IDs exist
    const { rows: promotions } = await pool.query(`
      SELECT id, username, cast_url, action_type, status, remaining_budget
      FROM promotions 
      ORDER BY id ASC
      LIMIT 10
    `);
    
    console.log('📋 Available promotions:');
    promotions.forEach(promo => {
      console.log(`  ID: ${promo.id}, User: @${promo.username}, Action: ${promo.action_type || 'NULL'}, Status: ${promo.status}, Budget: ${promo.remaining_budget}`);
    });
    
    // Check if we have any like_recast promotions
    const { rows: likeRecastPromos } = await pool.query(`
      SELECT id, username, cast_url, action_type, status, remaining_budget
      FROM promotions 
      WHERE action_type = 'like_recast' AND status = 'active'
      ORDER BY id ASC
    `);
    
    console.log('\n🎯 Like & Recast promotions:');
    if (likeRecastPromos.length === 0) {
      console.log('  ❌ No active like_recast promotions found');
    } else {
      likeRecastPromos.forEach(promo => {
        console.log(`  ✅ ID: ${promo.id}, User: @${promo.username}, Budget: ${promo.remaining_budget}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking promotions:', error);
  } finally {
    await pool.end();
  }
}

checkPromotions();
