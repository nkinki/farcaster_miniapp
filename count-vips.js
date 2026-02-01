const { Client } = require('pg');
const { createPublicClient, http, parseAbi } = require('viem');
const { base } = require('viem/chains');
require('dotenv').config();

const DIAMOND_VIP_ADDRESS = "0x4bcd137419c0f224bd19f0a0d2925e9b60934a39";
const ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
]);

const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

async function countVips() {
    await pgClient.connect();
    try {
        console.log("Fetching all linked wallets...");
        const result = await pgClient.query('SELECT fid, wallet_address FROM user_wallets');
        const rows = result.rows;

        const fidToWallets = {};
        rows.forEach(row => {
            if (!fidToWallets[row.fid]) fidToWallets[row.fid] = [];
            fidToWallets[row.fid].push(row.wallet_address);
        });

        const uniqueWallets = [...new Set(rows.map(r => r.wallet_address))];
        console.log(`Checking ${uniqueWallets.length} unique wallets for balance...`);

        const walletBalances = {};
        // Process in batches to avoid rate limits if many
        const batchSize = 5;
        for (let i = 0; i < uniqueWallets.length; i += batchSize) {
            const batch = uniqueWallets.slice(i, i + batchSize);
            await Promise.all(batch.map(async (wallet) => {
                try {
                    const balance = await publicClient.readContract({
                        address: DIAMOND_VIP_ADDRESS,
                        abi: ABI,
                        functionName: 'balanceOf',
                        args: [wallet],
                    });
                    walletBalances[wallet] = Number(balance);
                } catch (err) {
                    if (err.message.includes('rate limit')) {
                        console.warn(`Rate limit hit for ${wallet}, will retry in next script run or with more delay.`);
                    } else {
                        console.error(`Error checking ${wallet}:`, err.message);
                    }
                    walletBalances[wallet] = 0;
                }
            }));
            console.log(`Progress: ${Math.min(i + batchSize, uniqueWallets.length)}/${uniqueWallets.length}`);
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }

        let vipCount = 0;
        const vipFids = [];
        Object.keys(fidToWallets).forEach(fid => {
            const wallets = fidToWallets[fid];
            const hasNft = wallets.some(w => walletBalances[w] > 0);
            if (hasNft) {
                vipCount++;
                vipFids.push(fid);
            }
        });

        console.log("\n--- RESULT ---");
        console.log(`Total users with linked wallets: ${Object.keys(fidToWallets).length}`);
        console.log(`Total unique Diamond VIP holders (among app users): ${vipCount}`);
        console.log(`VIP FIDs: ${vipFids.join(', ')}`);

    } finally {
        await pgClient.end();
    }
}

countVips();
