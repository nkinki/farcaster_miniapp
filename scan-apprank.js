const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
});

async function scanAppRank() {
    try {
        const client = await pool.connect();

        // Get total count
        const countRes = await client.query('SELECT COUNT(*) FROM miniapps');
        console.log(`\n📊 Total apps in AppRank: ${countRes.rows[0].count}\n`);

        // Get all apps with weather, lotto, sunny, rainy in name
        const searchRes = await client.query(`
            SELECT name, domain, author_username 
            FROM miniapps 
            WHERE name ILIKE '%weather%' 
               OR name ILIKE '%sunny%' 
               OR name ILIKE '%rainy%'
               OR name ILIKE '%rain%'
               OR name ILIKE '%sun%'
            ORDER BY name
        `);

        console.log(`🔍 Apps matching weather/sun/rain keywords: ${searchRes.rows.length}\n`);
        searchRes.rows.forEach(app => {
            console.log(`📱 ${app.name}`);
            console.log(`   ${app.domain}`);
            console.log(`   by @${app.author_username}\n`);
        });

        // Get top 20 apps by rank
        console.log('\n🏆 Top 20 apps by current rank:\n');
        const topRes = await client.query(`
            SELECT m.name, m.domain, s.current_rank
            FROM miniapps m
            LEFT JOIN miniapp_statistics s ON m.id = s.miniapp_id
            WHERE s.stat_date = CURRENT_DATE
            ORDER BY s.current_rank ASC
            LIMIT 20
        `);

        topRes.rows.forEach((app, i) => {
            console.log(`${i + 1}. ${app.name} (Rank: ${app.current_rank || 'N/A'})`);
        });

        client.release();
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

scanAppRank();
