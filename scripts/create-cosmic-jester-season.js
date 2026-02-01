const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function createCosmicJesterSeason() {
    const client = await pool.connect();
    try {
        console.log('🎭 Creating Cosmic Jester Season...');

        // Create new season
        const result = await client.query(`
      INSERT INTO seasons (name, start_date, end_date, total_rewards, status, created_at)
      VALUES ('Cosmic Jester', '2026-02-01', '2026-02-28', '10000000', 'active', NOW())
      RETURNING *
    `);

        if (result.rowCount > 0) {
            console.log('✅ Season created successfully:');
            console.table(result.rows);
            console.log(`\n🎯 Season ID: ${result.rows[0].id}`);
            console.log(`📅 Duration: ${result.rows[0].start_date} to ${result.rows[0].end_date}`);
            console.log(`💰 Prize Pool: ${result.rows[0].total_rewards} CHESS`);
        }
    } catch (error) {
        console.error('❌ Failed to create season:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

createCosmicJesterSeason();
