
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function createTestCode() {
    const code = 'VIPTEST';
    console.log(`Creating test code: ${code}`);

    try {
        const client = await pool.connect();

        // Check if code exists
        const check = await client.query('SELECT * FROM daily_codes WHERE code = $1', [code]);

        if (check.rows.length > 0) {
            await client.query('UPDATE daily_codes SET is_active = TRUE WHERE code = $1', [code]);
            console.log('Code already exists, updated to active.');
        } else {
            await client.query(
                'INSERT INTO daily_codes (code, is_active, created_at) VALUES ($1, TRUE, NOW())',
                [code]
            );
            console.log('Test code created successfully!');
        }

        // Also clear previous usages for testing if needed
        // await client.query('DELETE FROM daily_code_usages WHERE code = $1', [code]);

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

createTestCode();
