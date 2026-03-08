const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const client = await pool.connect();
        const tables = ['promotions', 'airdrop_claims', 'shares', 'follow_actions', 'seasons'];

        for (const table of tables) {
            const res = await client.query(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
                [table]
            );
            console.log(`\nColumns for ${table}:`);
            res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
        }

        // Also check if RealRobWood is anywhere in promotions or shares
        console.log('\nSearching for "RealRobWood" in promotions...');
        const promoSearch = await client.query("SELECT * FROM promotions LIMIT 5");
        console.log('Sample promotions columns:', Object.keys(promoSearch.rows[0] || {}));

        client.release();
        pool.end();
    } catch (err) {
        console.error(err);
    }
}

run();
