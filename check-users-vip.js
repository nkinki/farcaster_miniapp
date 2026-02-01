const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
    await client.connect();
    try {
        console.log("--- TABLE: users ---");
        const resCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
        console.log(resCols.rows);

        console.log("\n--- VIP Claims (DIAMOND_VIP_FREE) ---");
        const resClaims = await client.query("SELECT COUNT(DISTINCT fid) FROM daily_code_usages WHERE code = 'DIAMOND_VIP_FREE'");
        console.log(`Unique FIDs who claimed VIP bundle: ${resClaims.rows[0].count}`);

        console.log("\n--- Top VIP Claimants ---");
        const resTop = await client.query("SELECT fid, COUNT(*) as uses FROM daily_code_usages WHERE code = 'DIAMOND_VIP_FREE' GROUP BY fid ORDER BY uses DESC LIMIT 5");
        console.log(resTop.rows);

    } finally {
        await client.end();
    }
}

checkUsers();
