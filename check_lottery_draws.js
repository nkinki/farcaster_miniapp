require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkLotteryDraws() {
    try {
        const client = await pool.connect();
        // Fetch last 5 draws
        const result = await client.query(`
      SELECT *
      FROM lottery_draws
      ORDER BY id DESC
      LIMIT 5
    `);

        if (result.rows.length > 0) {
            console.log('--- Legutóbbi Sorsolások (lottery_draws tábla) ---');
            result.rows.forEach(row => {
                console.log(`ID: ${row.id}`);
                console.log(`Draw Number: ${row.draw_number}`);
                console.log(`Winning Number: ${row.winning_number}`);
                // Log other likely columns if they exist, or just the whole row for inspection if schema is unknown
                // But let's try to be specific to avoid clutter, assuming standard names.
                // Or just log the whole row to be safe and see all columns.
                console.log(`Details: ${JSON.stringify(row)}`);
                console.log('-----------------------------');
            });
        } else {
            console.log('A lottery_draws tábla üres.');
        }

        client.release();
    } catch (err) {
        console.error('Hiba:', err);
    } finally {
        await pool.end();
    }
}

checkLotteryDraws();
