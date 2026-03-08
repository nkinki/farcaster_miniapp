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

const ATTACKER_ADDRESSES = [
    "0x247116c752420ec7FE870D1549a1C2e8d44675C6",
    "0x629eccf7c35C964f891ff23ED198F3016D74e975",
    "0xa15c76253E22e6B55aD20EC045d4cCF3F3a7aa4D"
];

async function checkDatabase() {
    console.log("Checking database for attacker activity...");

    for (const address of ATTACKER_ADDRESSES) {
        console.log(`\n--- Checking address: ${address} ---`);

        // Check claims table
        try {
            const claims = await sql`SELECT * FROM claims WHERE LOWER(recipient_address) = LOWER(${address})`;
            console.log(`Found ${claims.length} records in 'claims' table.`);
            if (claims.length > 0) console.log(claims);
        } catch (e) {
            console.log("Could not query 'claims' table.");
        }

        // Since we don't have all the tables mapped out exactly, we will try to look for the address in some common tables
        // Check users table (if they registered a wallet)
        try {
            const users = await sql`SELECT * FROM users WHERE LOWER(wallet_address) = LOWER(${address}) OR LOWER(verified_addresses::text) LIKE '%' || LOWER(${address}) || '%'`;
            console.log(`Found ${users.length} records in 'users' table.`);
            if (users.length > 0) console.log(users);
        } catch (e) { }
    }
}

checkDatabase().catch(console.error);
