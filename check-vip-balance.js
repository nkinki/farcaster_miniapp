const { createPublicClient, http, parseAbi } = require('viem');
const { base } = require('viem/chains');

const DIAMOND_VIP_ADDRESS = "0x4bcd137419c0f224bd19f0a0d2925e9b60934a39";
const ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
]);

const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

const wallets = [
    '0x05f2901e2C895a10fdbAa60E346de027b14A1875',
    '0x572215fF3228D192F4196A1b6D8A17e90449a550'
];

async function checkBalances() {
    for (const wallet of wallets) {
        try {
            const balance = await publicClient.readContract({
                address: DIAMOND_VIP_ADDRESS,
                abi: ABI,
                functionName: 'balanceOf',
                args: [wallet],
            });
            console.log(`Wallet ${wallet} balance: ${balance}`);
        } catch (err) {
            console.error(`Error checking ${wallet}:`, err.message);
        }
    }
}

checkBalances();
