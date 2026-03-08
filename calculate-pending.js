const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const client = await pool.connect();
        const fid = 1049927;

        console.log(`--- PENDING BALANCE FOR FID ${fid} ---`);

        // 1. Airdrop Claims (pending)
        const airdrops = await client.query("SELECT COALESCE(SUM(reward_amount::numeric), 0) as balance FROM airdrop_claims WHERE user_fid = $1 AND status = 'pending'", [fid]);
        const airdropPending = parseFloat(airdrops.rows[0].balance);
        console.log(`Airdrops Pending: ${airdropPending} $CHESS`);

        // 2. Shares (unclaimed)
        const shares = await client.query("SELECT COALESCE(SUM(reward_amount::numeric), 0) as balance FROM shares WHERE sharer_fid = $1 AND reward_claimed = FALSE", [fid]);
        const sharesPending = parseFloat(shares.rows[0].balance);
        console.log(`Shares Pending: ${sharesPending} $CHESS`);

        // 3. Follow Actions (unclaimed)
        const follows = await client.query("SELECT COALESCE(SUM(reward_amount::numeric), 0) as balance FROM follow_actions WHERE user_fid = $1 AND status = 'verified' AND reward_claimed = FALSE", [fid]);
        const followsPending = parseFloat(follows.rows[0].balance);
        console.log(`Follows Pending: ${followsPending} $CHESS`);

        // 4. Check for other reward types (like/recast)
        try {
            const likeRecast = await client.query("SELECT COALESCE(SUM(reward_amount::numeric), 0) as balance FROM like_recast_actions WHERE user_fid = $1 AND status = 'verified' AND reward_claimed = FALSE", [fid]);
            const lrPending = parseFloat(likeRecast.rows[0].balance);
            console.log(`Like/Recast Pending: ${lrPending} $CHESS`);

            const total = airdropPending + sharesPending + followsPending + lrPending;
            console.log(`\nTOTAL PENDING: ${total} $CHESS`);
        } catch (e) {
            const total = airdropPending + sharesPending + followsPending;
            console.log(`\nTOTAL PENDING: ${total} $CHESS`);
        }

        client.release();
        pool.end();
    } catch (err) {
        console.error(err);
    }
}

run();
