const { Pool } = require('pg');

const dbUrl = "postgresql://neondb_owner:npg_C3cIjdBfxT9K@ep-royal-fire-a4wvo99m-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkSeasons() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT * FROM seasons ORDER BY created_at DESC');
        console.log('SEASONS_DATA_START');
        console.log(JSON.stringify(res.rows, null, 2));
        console.log('SEASONS_DATA_END');
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSeasons();
