require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function main() {
    try {
        const sql = neon(process.env.NEON_DB_URL);
        const result = await sql`SELECT id, name, start_date, end_date, status FROM seasons ORDER BY end_date DESC NULLS LAST LIMIT 5`;
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(error);
    }
}

main();
