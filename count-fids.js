const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function countFids() {
    await client.connect();
    try {
        const res = await client.query("SELECT COUNT(DISTINCT fid) FROM user_wallets");
        console.log(`Unique FIDs in user_wallets: ${res.rows[0].count}`);
    } finally {
        await client.end();
    }
}

countFids();
