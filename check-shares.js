const { Pool } = require('pg');
const dotenv = require('dotenv');

// Try loading from multiple sources
console.log('🔄 Loading environment variables...');
dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) dotenv.config({ path: '.env.production' });
if (!process.env.DATABASE_URL) dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkValues() {
    try {
        console.log('🔍 Checking distinct action_types in shares table...');
        const res = await pool.query('SELECT DISTINCT action_type FROM shares');
        console.log('Found values:', res.rows);

        console.log('🔍 Checking distinct action_types in promotions table...');
        const res2 = await pool.query('SELECT DISTINCT action_type FROM promotions');
        console.log('Found values:', res2.rows);

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await pool.end();
    }
}

checkValues();
