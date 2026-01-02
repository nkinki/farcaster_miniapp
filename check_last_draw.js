require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkLastDraw() {
    try {
        const client = await pool.connect();
        const result = await client.query(`
      SELECT id, round_number, status, draw_date, end_date, created_at, winner_number, prize_pool
      FROM lambo_lottery_rounds
      ORDER BY id DESC
      LIMIT 1
    `);

        if (result.rows.length > 0) {
            const row = result.rows[0];
            console.log('--- Legutóbbi Sorsolás ---');
            console.log(`Round #${row.round_number} (ID: ${row.id})`);
            console.log(`Status: ${row.status}`);
            console.log(`Draw Date (UTC): ${row.draw_date ? new Date(row.draw_date).toUTCString() : 'Nincs kitűzve'}`);
            console.log(`End Date (UTC): ${row.end_date ? new Date(row.end_date).toUTCString() : 'Nincs kitűzve'}`);
            console.log(`Nyertes szám: ${row.winner_number !== null ? row.winner_number : 'Még nincs kihúzva'}`);

            const now = new Date();
            console.log(`Jelenlegi idő (UTC): ${now.toUTCString()}`);

        } else {
            console.log('Nincs adat a sorsolásokról.');
        }
        console.log('--------------------------');

        client.release();
    } catch (err) {
        console.error('Hiba:', err);
    } finally {
        await pool.end();
    }
}

checkLastDraw();
