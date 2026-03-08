import { createPublicClient, http, isAddress, formatUnits } from 'viem';
import { base } from 'viem/chains';

const url = "https://mainnet.base.org";
const publicClient = createPublicClient({
    chain: base,
    transport: http(url)
});

const ATTACKER = "0x247116c752420ec7FE870D1549a1C2e8d44675C6";
const CHESS_TOKEN = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07";

async function main() {
    console.log(`Investigating attacker address: ${ATTACKER}`);

    if (!isAddress(ATTACKER)) {
        console.error("Invalid address");
        return;
    }

    const balanceWei = await publicClient.getBalance({ address: ATTACKER });
    console.log(`ETH Balance: ${formatUnits(balanceWei, 18)} ETH`);

    try {
        const chessBalanceWei = await publicClient.readContract({
            address: CHESS_TOKEN,
            abi: [{ "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }],
            functionName: 'balanceOf',
            args: [ATTACKER]
        });
        console.log(`CHESS Balance: ${formatUnits(chessBalanceWei as bigint, 18)} CHESS`);
    } catch (error) {
        console.error("Failed to read CHESS balance", error);
    }

    console.log("\\nTo get full transaction history, we need to use an indexing service like BaseScan API.");
}

main().catch(console.error);
