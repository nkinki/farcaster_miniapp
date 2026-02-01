// Check backend wallet balance on Base network
require('dotenv').config();
const { createPublicClient, http, formatUnits } = require('viem');
const { base } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';

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

async function checkWalletBalance() {
    console.log('\n💰 BACKEND WALLET CHESS BALANCE CHECK\n');
    console.log('='.repeat(60));

    const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;

    if (!privateKey) {
        console.log('\n❌ ERROR: BACKEND_WALLET_PRIVATE_KEY not found in .env');
        console.log('This is configured in Vercel secrets for production.');
        return;
    }

    const account = privateKeyToAccount(privateKey);
    const walletAddress = account.address;

    console.log('\n📍 Backend Wallet:', walletAddress);
    console.log('🪙 CHESS Token:', CHESS_TOKEN_ADDRESS);
    console.log('🌐 Network: Base');

    try {
        // Check CHESS balance
        const chessBalance = await publicClient.readContract({
            address: CHESS_TOKEN_ADDRESS,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddress]
        });

        const balanceFormatted = formatUnits(chessBalance, 18);
        const balanceNumber = Number(balanceFormatted);

        console.log('\n📊 Current CHESS Balance:', balanceNumber.toLocaleString(), 'CHESS');
        console.log('💎 Required for lottery claim: 8,630,000 CHESS');

        if (balanceNumber >= 8630000) {
            console.log('\n✅ SUFFICIENT BALANCE! Wallet can pay the prize.');
            console.log('The claim should work now.');
        } else {
            console.log('\n❌ INSUFFICIENT BALANCE!');
            console.log('💸 Shortfall:', (8630000 - balanceNumber).toLocaleString(), 'CHESS');
            console.log('\n🚨 THIS IS WHY THE CLAIM IS FAILING!');
            console.log('\n📝 Solution:');
            console.log('   1. Transfer CHESS tokens to the backend wallet');
            console.log('   2. Or reduce the lottery prize amount');
            console.log('   3. Or use a different funding mechanism');
        }

        // Check ETH balance for gas
        const ethBalance = await publicClient.getBalance({ address: walletAddress });
        const ethFormatted = formatUnits(ethBalance, 18);

        console.log('\n⛽ ETH Balance (for gas):', ethFormatted, 'ETH');
        if (Number(ethFormatted) < 0.001) {
            console.log('⚠️  Low ETH balance! May not have enough for gas fees.');
        }

        console.log('\n🔗 View wallet on BaseScan:');
        console.log(`https://basescan.org/address/${walletAddress}`);
        console.log('\n' + '='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Error checking balance:', error.message);
        console.error('Full error:', error);
    }
}

checkWalletBalance();
