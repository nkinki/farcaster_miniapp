const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkLottoToken() {
    try {
        const res = await pool.query("SELECT * FROM notification_tokens WHERE app_id = 'lambo-lotto'");
        console.log('Lambo Lotto tokens:');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkLottoToken();
