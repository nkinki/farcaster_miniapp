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

async function verify() {
    await pgClient.connect();
    try {
        const fid = 439015;
        console.log(`Verifying VIP status for FID: ${fid}`);

        // 1. Get all wallets (logic from updated isDiamondVip)
        const result = await pgClient.query(
            'SELECT wallet_address FROM user_wallets WHERE fid = $1',
            [fid]
        );

        const wallets = result.rows.map(row => row.wallet_address);
        console.log('Linked wallets:', wallets);

        let finalResult = { isVip: false, debugInfo: { wallets, results: [] } };
        for (const walletAddress of wallets) {
            try {
                const balance = await publicClient.readContract({
                    address: DIAMOND_VIP_ADDRESS,
                    abi: ABI,
                    functionName: 'balanceOf',
                    args: [walletAddress],
                });
                const balNum = Number(balance);
                console.log(`- Wallet ${walletAddress}: balance ${balNum}`);
                finalResult.debugInfo.results.push({ wallet: walletAddress, balance: balNum });
                if (balNum > 0) {
                    finalResult.isVip = true;
                }
            } catch (err) {
                console.error(`- Error checking ${walletAddress}:`, err.message);
                finalResult.debugInfo.results.push({ wallet: walletAddress, error: err.message });
            }
        }

        console.log(`FINAL RESULT:`, JSON.stringify(finalResult, null, 2));
        if (!finalResult.isVip) {
            console.error('FAILED: User should be VIP');
            process.exit(1);
        } else {
            console.log('SUCCESS: User correctly identified as VIP!');
        }

    } finally {
        await pgClient.end();
    }
}

verify();
