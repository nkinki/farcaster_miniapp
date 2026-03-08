const { createPublicClient, createWalletClient, http } = require('viem');
const { base } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
require('dotenv').config();

const LOTTO_PAYMENT_ROUTER_ABI = [
    {
        "inputs": [{ "internalType": "address", "name": "_newWallet", "type": "address" }],
        "name": "setDestinationWallet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    }
];

const LOTTO_PAYMENT_ROUTER_ADDRESS = "0xdae08347a8a2d508d9f7a890b9997d771aab6d71";

async function main() {
    // Use TREASURY_PRIVATE_KEY from environment to avoid hardcoding
    let pKey = process.env.TREASURY_PRIVATE_KEY || process.env.BACKEND_WALLET_PRIVATE_KEY;
    if (!pKey) {
        console.error("❌ No private key found in environment variables.");
        process.exit(1);
    }

    // Clean key
    pKey = pKey.trim().replace(/^["'](.+)["']$/, '$1');
    if (!pKey.startsWith('0x')) pKey = `0x${pKey}`;

    const account = privateKeyToAccount(pKey);
    console.log(`🏦 Using account: ${account.address}`);

    const publicClient = createPublicClient({
        chain: base,
        transport: http()
    });

    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http()
    });

    try {
        const owner = await publicClient.readContract({
            address: LOTTO_PAYMENT_ROUTER_ADDRESS,
            abi: LOTTO_PAYMENT_ROUTER_ABI,
            functionName: 'owner'
        });

        console.log(`👤 Contract Owner: ${owner}`);

        // The new treasury address (derived from the same key if it's the owner)
        const newTreasuryAddress = account.address;
        console.log(`🎯 Setting new destinationWallet to: ${newTreasuryAddress}`);

        if (owner.toLowerCase() !== account.address.toLowerCase()) {
            console.warn("⚠️ Warning: Your account is not the contract owner. This might fail.");
        }

        const hash = await walletClient.writeContract({
            address: LOTTO_PAYMENT_ROUTER_ADDRESS,
            abi: LOTTO_PAYMENT_ROUTER_ABI,
            functionName: 'setDestinationWallet',
            args: [newTreasuryAddress]
        });

        console.log(`✅ Transaction sent! Hash: ${hash}`);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`🎉 Transaction confirmed in block ${receipt.blockNumber}! Status: ${receipt.status}`);

    } catch (error) {
        console.error("❌ Error updating contract:", error);
    }
}

main();
