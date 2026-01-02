import { wrapFetchWithPayment } from '@chess/x402-fetch';

/**
 * Pre-configured x402 client for the $CHESS ecosystem.
 * Automatically handles 402 Payment Required responses for $CHESS tokens on Base.
 */
export const chessClient = wrapFetchWithPayment(window.fetch, {
    tokenAddress: '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07', // $CHESS token on Base
    chainId: 8453, // Base Mainnet
    symbol: '$CHESS'
});
