const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkStats() {
    await client.connect();
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log(`Checking stats for date: ${today}`);

        // Check count
        const resCount = await client.query('SELECT COUNT(*) FROM miniapp_statistics WHERE stat_date = $1', [today]);
        console.log(`Count of stats for today: ${resCount.rows[0].count}`);

        if (resCount.rows[0].count > 0) {
            // Check Top 5 Overall
            const resTop = await client.query(`
            SELECT m.name, s.current_rank 
            FROM miniapp_statistics s
            JOIN miniapps m ON s.miniapp_id = m.id
            WHERE s.stat_date = $1
            ORDER BY s.current_rank ASC
            LIMIT 5
        `, [today]);
            console.log('Top 5 Overall in DB:', resTop.rows);

            // Check Top 5 Gainers
            const resGainers = await client.query(`
            SELECT m.name, s.rank_24h_change 
            FROM miniapp_statistics s
            JOIN miniapps m ON s.miniapp_id = m.id
            WHERE s.stat_date = $1 AND s.rank_24h_change IS NOT NULL
            ORDER BY s.rank_24h_change DESC
            LIMIT 5
        `, [today]);
            console.log('Top 5 Gainers in DB:', resGainers.rows);
        } else {
            console.log('No stats found for today. Checking max date...');
            const resMax = await client.query('SELECT MAX(stat_date) as max_date FROM miniapp_statistics');
            console.log(`Max date in DB: ${resMax.rows[0].max_date}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkStats();
