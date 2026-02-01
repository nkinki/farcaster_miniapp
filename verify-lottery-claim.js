// Verify lottery claim transaction
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function verifyLotteryClaim() {
    const fid = 815252;

    try {
        const client = await pool.connect();

        // Get the claim details from claims table
        console.log('\n🔍 Checking claims table for lottery winnings...\n');

        const claimsResult = await client.query(`
      SELECT 
        id,
        user_fid,
        amount,
        shares_count,
        recipient_address,
        tx_hash,
        created_at
      FROM claims
      WHERE user_fid = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [fid]);

        console.log(`Found ${claimsResult.rows.length} claim(s):\n`);

        claimsResult.rows.forEach((claim, index) => {
            console.log(`--- Claim #${index + 1} ---`);
            console.log(`Amount: ${claim.amount} CHESS`);
            console.log(`Recipient: ${claim.recipient_address}`);
            console.log(`Transaction: ${claim.tx_hash}`);
            console.log(`Date: ${new Date(claim.created_at).toLocaleString()}`);
            console.log(`BaseScan: https://basescan.org/tx/${claim.tx_hash}`);
            console.log('');
        });

        // Get lottery winnings with claim info
        console.log('\n🎰 Checking lottery_winnings table...\n');

        const lotteryResult = await client.query(`
      SELECT 
        lw.id,
        lw.amount_won,
        lw.claimed_at,
        lw.created_at,
        ld.draw_number,
        ld.winning_number,
        lt.number as ticket_number
      FROM lottery_winnings lw
      JOIN lottery_draws ld ON lw.draw_id = ld.id
      JOIN lottery_tickets lt ON lw.ticket_id = lt.id
      WHERE lw.player_fid = $1
      ORDER BY lw.created_at DESC
    `, [fid]);

        lotteryResult.rows.forEach((winning, index) => {
            console.log(`--- Lottery Win #${index + 1} ---`);
            console.log(`Draw #${winning.draw_number}`);
            console.log(`Winning Number: ${winning.winning_number}`);
            console.log(`Your Ticket: ${winning.ticket_number}`);
            console.log(`Amount: ${winning.amount_won} CHESS`);
            console.log(`Claimed: ${winning.claimed_at ? new Date(winning.claimed_at).toLocaleString() : 'NOT CLAIMED'}`);
            console.log('');
        });

        // Get user's wallet address from Neynar
        console.log('\n🔗 Fetching wallet address from Neynar...\n');

        const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
            headers: {
                accept: 'application/json',
                api_key: process.env.NEYNAR_API_KEY
            }
        });

        if (neynarResponse.ok) {
            const neynarData = await neynarResponse.json();
            const walletAddress = neynarData.users[0]?.verified_addresses?.eth_addresses[0];

            if (walletAddress) {
                console.log(`Your verified wallet: ${walletAddress}`);
                console.log(`\n📊 Check your CHESS balance on BaseScan:`);
                console.log(`https://basescan.org/token/0x4b8c1c9e8f8e8f8e8f8e8f8e8f8e8f8e8f8e8f8e?a=${walletAddress}`);
                console.log(`\n💰 Or check on Base network in your wallet for token:`);
                console.log(`CHESS Token: 0x23d29D30e35C5e8D321e1dc9A8a61BFD846D4C5c`);
            }
        }

        client.release();
        await pool.end();

    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

verifyLotteryClaim();
