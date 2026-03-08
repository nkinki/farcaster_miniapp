const { neon } = require('@neondatabase/serverless');
const path = require('path');
const fs = require('fs');

// Load environment variables
['.env', '.env.local', '.env.production'].forEach(file => {
    const envPath = path.resolve(__dirname, '../' + file);
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
    }
});

const connectionString = process.env.NEON_DB_URL || process.env.DATABASE_URL;
if (!connectionString) {
    console.error("No database connection string found.");
    process.exit(1);
}

const sql = neon(connectionString);

const TX_HASHES = [
    "0x188b30b", "0xc88d0f5", "0x309363e", "0xf37fb04", "0x367ea54",
    "0xaccb5ca", "0xa197a78", "0x5e6f446", "0xbdea583", "0x5792841",
    "0xc20933d", "0xb7309b2", "0x2dabe3c", "0x15db0fe", "0x3379dda",
    "0x985b5f8", "0x4db3ce2", "0x82e84dc", "0x4831849", "0x1b39f1f",
    "0x7de10eb", "0xb5a5531", "0x54fc5da", "0xdd784e3", "0x868654a"
];

async function checkDatabase() {
    console.log("Checking database for transaction hashes (starting with)...");

    for (const hash of TX_HASHES) {
        try {
            const claims = await sql`SELECT * FROM claims WHERE tx_hash ILIKE ${hash + '%'}`;
            if (claims.length > 0) {
                console.log(`\nMatch found in claims for hash prefix ${hash}:`);
                console.log(claims);
            }
        } catch (e) {
            console.log(`Could not query 'claims' table for ${hash}.`);
        }

        try {
            const lotto = await sql`SELECT * FROM lottery_winnings WHERE transaction_hash ILIKE ${hash + '%'}`;
            if (lotto.length > 0) {
                console.log(`\nMatch found in lottery_winnings for hash prefix ${hash}:`);
                console.log(lotto);
            }
        } catch (e) {
            // Ignore if column doesn't exist
        }

        try {
            const airdrops = await sql`SELECT * FROM airdrop_claims WHERE transaction_hash ILIKE ${hash + '%'}`;
            if (airdrops.length > 0) {
                console.log(`\nMatch found in airdrop_claims for hash prefix ${hash}:`);
                console.log(airdrops);
            }
        } catch (e) { }
    }
    console.log("Done checking tx hashes.");
}

checkDatabase().catch(console.error);
