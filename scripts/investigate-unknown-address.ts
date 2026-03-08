import { createPublicClient, http, isAddress, formatUnits } from 'viem';
import { base } from 'viem/chains';

const url = "https://mainnet.base.org";
const publicClient = createPublicClient({
    chain: base,
    transport: http(url)
});

const UNKNOWN_ADDRESSES = [
    "0x629eccf7c35C964f891ff23ED198F3016D74e975",
    "0xa15c76253E22e6B55aD20EC045d4cCF3F3a7aa4D"
];
const CHESS_TOKEN = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07";

async function main() {
    console.log(`Investigating other suspicious addresses...`);

    for (const address of UNKNOWN_ADDRESSES) {
        console.log(`\nAnalyzing ${address}:`);
        if (!isAddress(address)) {
            console.error("Invalid address");
            continue;
        }

        const balanceWei = await publicClient.getBalance({ address });
        console.log(`ETH Balance: ${formatUnits(balanceWei, 18)} ETH`);

        try {
            const chessBalanceWei = await publicClient.readContract({
                address: CHESS_TOKEN,
                abi: [{ "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }],
                functionName: 'balanceOf',
                args: [address]
            });
            console.log(`CHESS Balance: ${formatUnits(chessBalanceWei as bigint, 18)} CHESS`);
        } catch (error) {
            console.error("Failed to read CHESS balance", error);
        }
    }
}

main().catch(console.error);
