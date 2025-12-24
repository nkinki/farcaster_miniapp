const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function findAllByAuthor() {
    try {
        const client = await pool.connect();

        // Get all apps by the same author as Lambo Lotto
        const res = await client.query(`
            SELECT DISTINCT m.name, m.domain, m.author_username, m.author_fid
            FROM miniapps m
            WHERE m.author_fid IN (
                SELECT author_fid FROM miniapps WHERE name = 'Lambo Lotto'
            )
            ORDER BY m.name
        `);

        console.log(`\n🔍 Found ${res.rows.length} app(s) by the same author:\n`);
        res.rows.forEach(app => {
            console.log(`📱 ${app.name}`);
            console.log(`   Domain: ${app.domain}`);
            console.log(`   Author: @${app.author_username} (FID: ${app.author_fid})\n`);
        });

        client.release();
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

findAllByAuthor();
