const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.NEON_DB_URL);

async function checkDatabase() {
  try {
    console.log('🔍 Checking promotions table...');
    
    // Check the latest promotions with action_type
    const promotions = await sql`
      SELECT id, username, cast_url, action_type, created_at 
      FROM promotions 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log('📊 Latest 5 promotions:');
    promotions.forEach((promo, index) => {
      console.log(`${index + 1}. ID: ${promo.id}, User: ${promo.username}, Action: ${promo.action_type || 'NULL'}, Created: ${promo.created_at}`);
    });
    
    // Check action_type distribution
    const actionTypeStats = await sql`
      SELECT action_type, COUNT(*) as count 
      FROM promotions 
      GROUP BY action_type
    `;
    
    console.log('\n📈 Action type distribution:');
    actionTypeStats.forEach(stat => {
      console.log(`${stat.action_type || 'NULL'}: ${stat.count} promotions`);
    });
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase();