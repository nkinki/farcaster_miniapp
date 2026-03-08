import { createPublicClient, http, formatUnits, parseAbiItem } from 'viem';
import { base } from 'viem/chains';

const url = "https://mainnet.base.org";
const publicClient = createPublicClient({
    chain: base,
    transport: http(url)
});

const TREASURY = "0xA8D044F91C7A92fC2632d00B0b94869aaDCd90E6";
const CHESS_TOKEN = "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07";

async function main() {
    console.log(`Analyzing 20k pattern from Treasury (${TREASURY})`);

    try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - BigInt(100000); // Roughly last few days on Base (Base does 2s blocks, so 200k = ~4.6 days)

        const CHUNK_SIZE = BigInt(10000);
        console.log(`Fetching Transfer events from block ${fromBlock} to ${currentBlock} in ${CHUNK_SIZE} increments...`);

        let logs: any[] = [];
        for (let start = fromBlock; start < currentBlock; start += CHUNK_SIZE) {
            let end = start + CHUNK_SIZE - BigInt(1);
            if (end > currentBlock) end = currentBlock;
            console.log(`Fetching ${start} to ${end}...`);
            const chunkLogs = await publicClient.getLogs({
                address: CHESS_TOKEN,
                event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
                args: {
                    from: TREASURY
                },
                fromBlock: start,
                toBlock: end
            });
            logs = logs.concat(...chunkLogs);
        }

        console.log(`Found ${logs.length} transfers from treasury.`);

        let pattern20kCount = 0;

        for (const log of logs) {
            const { to, value } = log.args;
            const amountFormat = formatUnits(value || BigInt(0), 18);

            if (amountFormat === "20000") {
                pattern20kCount++;
                console.log(`- 20k Transfer: TX Hash: ${log.transactionHash} To: ${to}`);
            }
        }

        console.log(`\nTotal 20k pattern transfers found: ${pattern20kCount}`);
    } catch (error: any) {
        console.error("Failed to fetch event logs", error.message);
    }
}

main().catch(console.error);
