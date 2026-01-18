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
export async function isDiamondVip(fid: number | string): Promise<{ isVip: boolean; debugInfo?: any }> {
    const debugInfo: any = { fid, wallets: [], results: [] };
    try {
        // 1. Get all wallet addresses for the FID
        const result = await pool.query(
            'SELECT wallet_address FROM user_wallets WHERE fid = $1',
            [fid]
        );

        if (result.rows.length === 0) {
            debugInfo.error = 'No wallets found in DB for this FID';
            return { isVip: false, debugInfo };
        }

        const wallets = result.rows.map(row => row.wallet_address as `0x${string}`);
        debugInfo.wallets = wallets;

        // 2. Check on-chain balance for each wallet
        for (const walletAddress of wallets) {
            try {
                const balance = await publicClient.readContract({
                    address: DIAMOND_VIP_ADDRESS as `0x${string}`,
                    abi: ABI,
                    functionName: 'balanceOf',
                    args: [walletAddress],
                });

                const balNum = Number(balance);
                debugInfo.results.push({ wallet: walletAddress, balance: balNum });

                if (balNum > 0) {
                    return { isVip: true, debugInfo };
                }
            } catch (walletError: any) {
                console.error(`Error checking balance for wallet ${walletAddress}:`, walletError);
                debugInfo.results.push({ wallet: walletAddress, error: walletError.message });
            }
        }

        return { isVip: false, debugInfo };
    } catch (error: any) {
        console.error(`Error checking Diamond VIP status for FID ${fid}:`, error);
        debugInfo.error = error.message;
        return { isVip: false, debugInfo };
    }
}
