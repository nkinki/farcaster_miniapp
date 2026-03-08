require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function main() {
    try {
        const sql = neon(process.env.NEON_DB_URL);

        // Set start date to now, end date to 30 days from now
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        const result = await sql`
      INSERT INTO seasons (name, start_date, end_date, total_rewards, status, created_at, updated_at)
      VALUES (
        'Season 10', 
        ${startDate.toISOString()}, 
        ${endDate.toISOString()}, 
        '10000000', 
        'active', 
        NOW(), 
        NOW()
      )
      RETURNING id, name, start_date, end_date
    `;

        console.log('Successfully created Season 10!');
        console.log(JSON.stringify(result[0], null, 2));

    } catch (error) {
        console.error(error);
    }
}

main();
