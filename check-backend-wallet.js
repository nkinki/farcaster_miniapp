// Check backend wallet CHESS balance
require('dotenv').config();
const { createPublicClient, http, formatUnits } = require('viem');
const { base } = require('viem/chains');

const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';
const BACKEND_WALLET = process.env.BACKEND_WALLET_ADDRESS || 'Not configured';

const publicClient = createPublicClient({
    chain: base,
    transport: http()
});

const erc20Abi = [
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "type": "function"
    }
];

async function checkBackendWallet() {
    console.log('\n💰 BACKEND WALLET BALANCE CHECK\n');
    console.log('='.repeat(60));
    console.log('\nBackend Wallet:', BACKEND_WALLET);
    console.log('CHESS Token:', CHESS_TOKEN_ADDRESS);
    console.log('Network: Base');

    if (!BACKEND_WALLET || BACKEND_WALLET === 'Not configured') {
        console.log('\n❌ ERROR: BACKEND_WALLET_ADDRESS not configured in .env');
        console.log('Cannot check balance without wallet address.');
        return;
    }

    try {
        const balance = await publicClient.readContract({
            address: CHESS_TOKEN_ADDRESS,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [BACKEND_WALLET]
        });

        const balanceFormatted = formatUnits(balance, 18);
        const balanceNumber = Number(balanceFormatted);

        console.log('\n📊 Balance:', balanceNumber.toLocaleString(), 'CHESS');
        console.log('Required for claim: 8,630,000 CHESS');

        if (balanceNumber >= 8630000) {
            console.log('\n✅ Sufficient balance! Wallet can pay the prize.');
        } else {
            console.log('\n❌ INSUFFICIENT BALANCE!');
            console.log('Shortfall:', (8630000 - balanceNumber).toLocaleString(), 'CHESS');
            console.log('\n🚨 This is why the claim is failing!');
            console.log('The backend wallet needs to be topped up with CHESS tokens.');
        }

        console.log('\n🔗 View wallet on BaseScan:');
        console.log(`https://basescan.org/address/${BACKEND_WALLET}`);
        console.log('\n' + '='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Error checking balance:', error.message);
    }
}

checkBackendWallet();
