const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkPromotionsSchema() {
    try {
        console.log('🔍 Checking promotions table schema...');

        const { rows: columns } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'promotions' 
      ORDER BY ordinal_position
    `);

        console.log('📊 Promotions Table Columns:');
        columns.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

        // Also peek at a few rows to see what data looks like
        console.log('\n👀 Peeking at first 5 rows (status/active related columns):');
        const { rows: data } = await pool.query(`SELECT * FROM promotions LIMIT 5`);
        if (data.length > 0) {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log("Table is empty.");
        }

    } catch (error) {
        console.error('❌ Error checking promotions:', error);
    } finally {
        await pool.end();
    }
}

checkPromotionsSchema();
