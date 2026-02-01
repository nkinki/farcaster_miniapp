const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function countVipTickets() {
    await client.connect();
    try {
        const res = await client.query("SELECT COUNT(DISTINCT player_fid) FROM lottery_tickets WHERE transaction_hash LIKE 'vip_bundle_%'");
        console.log(`Unique FIDs with VIP lottery tickets: ${res.rows[0].count}`);
    } finally {
        await client.end();
    }
}

countVipTickets();
