const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
    try {
        console.log('🔍 Checking Neon database tables...');

        // Check what tables exist
        const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

        console.log('📋 Existing tables:');
        tables.forEach(table => {
            console.log(`  - ${table.table_name}`);
        });

        console.log('\n✅ Connection successful!');

    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        await pool.end();
    }
}

checkDatabase();
