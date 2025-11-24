const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findStoppedPromotions() {
    try {
        console.log('🔍 Checking distinct statuses...');

        const { rows: statuses } = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM promotions 
      GROUP BY status
    `);

        console.log('📊 Promotion Statuses:');
        statuses.forEach(s => {
            console.log(`  - ${s.status}: ${s.count}`);
        });

        const { rows: unusualPromos } = await pool.query(`
        SELECT id, username, status, created_at, total_budget, remaining_budget 
        FROM promotions 
        WHERE status NOT IN ('active', 'completed', 'pending')
    `);

        if (unusualPromos.length > 0) {
            console.log('\n⚠️ Potentially stopped/unusual promotions:');
            unusualPromos.forEach(p => {
                console.log(`  ID: ${p.id}, User: ${p.username}, Status: ${p.status}, Budget: ${p.remaining_budget}/${p.total_budget}`);
            });
        } else {
            console.log('\nℹ️ No promotions found with status other than active/completed/pending.');
        }

    } catch (error) {
        console.error('❌ Error checking promotions:', error);
    } finally {
        await pool.end();
    }
}

findStoppedPromotions();
