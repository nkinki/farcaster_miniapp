import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import pool from './db';
import { DIAMOND_VIP_ADDRESS } from '@/abis/diamondVip';

const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

const ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
]);

/**
 * Checks if a user (FID) owns the Diamond VIP NFT.
 * Uses a combination of DB lookup for wallet address and on-chain check.
 */
export async function isDiamondVip(fid: number | string): Promise<boolean> {
    try {
        // 1. Get wallet address for the FID
        const result = await pool.query(
            'SELECT wallet_address FROM user_wallets WHERE fid = $1 LIMIT 1',
            [fid]
        );

        if (result.rows.length === 0) {
            return false;
        }

        const walletAddress = result.rows[0].wallet_address as `0x${string}`;

        // 2. Check on-chain balance
        // Note: In production, consider caching this result for 5-10 minutes
        const balance = await publicClient.readContract({
            address: DIAMOND_VIP_ADDRESS as `0x${string}`,
            abi: ABI,
            functionName: 'balanceOf',
            args: [walletAddress],
        });

        return Number(balance) > 0;
    } catch (error) {
        console.error(`Error checking Diamond VIP status for FID ${fid}:`, error);
        return false;
    }
}
