require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkActivity() {
    try {
        const client = await pool.connect();

        const rounds = await client.query('SELECT COUNT(*) FROM lambo_lottery_rounds');
        console.log(`Lambo Rounds Count: ${rounds.rows[0].count}`);

        const tickets = await client.query('SELECT COUNT(*) FROM lambo_lottery_tickets');
        console.log(`Lambo Tickets Count: ${tickets.rows[0].count}`);

        const stats = await client.query('SELECT * FROM lambo_lottery_stats');
        console.log('Lambo Stats:', stats.rows[0] || 'No stats');

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkActivity();
