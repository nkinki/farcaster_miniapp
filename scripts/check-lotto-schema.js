const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkSchema() {
    try {
        const res = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'lottery_tickets'
        ORDER BY ordinal_position
    `);
        console.log('lottery_tickets schema:');
        res.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable})`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
