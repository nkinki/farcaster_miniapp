const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkStructure() {
    try {
        // Check table structure
        const { rows: columns } = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'promotions'
            ORDER BY ordinal_position
        `);

        console.log('📋 Promotions table columns:');
        columns.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        // Get a sample row to see actual data
        const { rows: sample } = await pool.query(`
            SELECT * FROM promotions LIMIT 1
        `);

        console.log('\n📄 Sample row:');
        if (sample.length > 0) {
            console.log(JSON.stringify(sample[0], null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkStructure();
