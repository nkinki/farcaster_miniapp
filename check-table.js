require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkTable() {
    const client = await pool.connect();
    try {
        console.log('🔍 Checking table season_participants...');
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'season_participants'
    `);

        if (res.rows.length === 0) {
            console.log('❌ Table season_participants NOT found.');

            // List all tables to be sure
            console.log('\n📋 Available tables:');
            const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
            tables.rows.forEach(t => console.log(`- ${t.table_name}`));

        } else {
            console.log('✅ Table season_participants found with columns:');
            res.rows.forEach(col => {
                console.log(`- ${col.column_name} (${col.data_type})`);
            });

            // Check content sample
            const content = await client.query('SELECT * FROM season_participants LIMIT 5');
            console.log(`\n📊 Sample data (${content.rows.length} rows):`);
            console.log(content.rows);
        }
    } catch (err) {
        console.error('❌ Error querying database:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkTable();
