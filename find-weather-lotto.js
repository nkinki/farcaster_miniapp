const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function findWeatherLotto() {
    try {
        const client = await pool.connect();

        // Search for Weather Lotto app
        const res = await client.query(`
            SELECT id, name, domain, author_username, author_fid 
            FROM miniapps 
            WHERE name ILIKE '%weather%' OR name ILIKE '%lotto%'
            ORDER BY name
        `);

        console.log(`Found ${res.rows.length} app(s):`);
        res.rows.forEach(app => {
            console.log(`\n📱 ${app.name}`);
            console.log(`   ID: ${app.id}`);
            console.log(`   Domain: ${app.domain}`);
            console.log(`   Author: @${app.author_username} (FID: ${app.author_fid})`);
        });

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

findWeatherLotto();
