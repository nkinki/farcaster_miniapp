require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTable(tableName) {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1
        `, [tableName]);
        console.log(`--- Columns of ${tableName} ---`);
        result.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

const table = process.argv[2] || 'user_wallets';
checkTable(table);
