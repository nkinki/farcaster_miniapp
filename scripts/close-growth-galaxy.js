const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function closeSeason() {
    const client = await pool.connect();
    try {
        console.log('🚀 Closing Growth Galaxy season in database...');

        // Update status to completed and set end_date
        const result = await client.query(`
      UPDATE seasons 
      SET status = 'completed', 
          end_date = '2026-01-31' 
      WHERE name = 'Growth Galaxy' 
      OR id = 1
      RETURNING *
    `);

        if (result.rowCount > 0) {
            console.log('✅ Season updated successfully:');
            console.table(result.rows);
        } else {
            console.log('⚠️ No season found with name "Growth Galaxy" or ID 1.');
        }
    } catch (error) {
        console.error('❌ Failed to update season:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

closeSeason();
