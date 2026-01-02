const { Pool } = require('pg');
require('dotenv').config();

async function verifyZeroPending() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        const fid = 1049927;

        console.log(`\n--- Final Verification for FID ${fid} (cartoonmeseries) ---`);

        // 1. Check Shares
        const shares = await client.query(`
      SELECT COUNT(*) as pending_count, COALESCE(SUM(reward_amount), 0) as pending_amount
      FROM shares
      WHERE sharer_fid = $1 AND reward_claimed = FALSE
    `, [fid]);

        // 2. Check Follow Actions
        const follows = await client.query(`
      SELECT COUNT(*) as pending_count, COALESCE(SUM(reward_amount), 0) as pending_amount
      FROM follow_actions
      WHERE user_fid = $1 AND status = 'verified' AND reward_claimed = FALSE
    `, [fid]);

        // 3. Check Airdrop Claims
        const airdrops = await client.query(`
      SELECT COUNT(*) as pending_count, COALESCE(SUM(reward_amount::numeric), 0) as pending_amount
      FROM airdrop_claims
      WHERE user_fid = $1 AND status = 'pending'
    `, [fid]);

        console.log('Results:');
        console.log(` - Shares: ${shares.rows[0].pending_count} pending (${shares.rows[0].pending_amount} $CHESS)`);
        console.log(` - Follows: ${follows.rows[0].pending_count} pending (${follows.rows[0].pending_amount} $CHESS)`);
        console.log(` - Airdrop Claims: ${airdrops.rows[0].pending_count} pending (${airdrops.rows[0].pending_amount} $CHESS)`);

        const totalPending = parseFloat(shares.rows[0].pending_amount) +
            parseFloat(follows.rows[0].pending_amount) +
            parseFloat(airdrops.rows[0].pending_amount);

        console.log(`\nTotal Pending: ${totalPending} $CHESS`);

        client.release();
        pool.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

verifyZeroPending();
