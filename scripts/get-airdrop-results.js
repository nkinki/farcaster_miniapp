require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function main() {
    try {
        const sql = neon(process.env.NEON_DB_URL);
        const seasonId = 9;

        // Get total amount distributed
        const totalResult = await sql`
      SELECT SUM(reward_amount) as total_distributed 
      FROM airdrop_claims 
      WHERE season_id = ${seasonId}
    `;

        // Get top 10 earners
        const topEarners = await sql`
      SELECT 
        user_fid, 
        points_used, 
        reward_amount 
      FROM airdrop_claims 
      WHERE season_id = ${seasonId}
      ORDER BY reward_amount DESC 
      LIMIT 10
    `;

        console.log('--- AIRDROP EREDMÉNYEK (Szezon 9) ---');
        console.log(`Összesen szétosztva: ${totalResult[0]?.total_distributed || 0} CHESS`);
        console.log('\n--- TOP 10 JÁTÉKOS ---');
        console.table(topEarners);

    } catch (error) {
        console.error(error);
    }
}

main();
