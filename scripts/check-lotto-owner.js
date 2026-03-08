const { createPublicClient, http } = require('viem');
const { base } = require('viem/chains');

const LOTTO_PAYMENT_ROUTER_ABI = [
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
    const publicClient = createPublicClient({
        chain: base,
        transport: http()
    });

    try {
        const owner = await publicClient.readContract({
            address: LOTTO_PAYMENT_ROUTER_ADDRESS,
            abi: LOTTO_PAYMENT_ROUTER_ABI,
            functionName: 'owner'
        });
        console.log(`The CURRENT owner of the Lotto contract is: ${owner}`);
    } catch (error) {
        console.error("Error reading owner:", error);
    }
}

main();
