// File: /src/lib/contracts.ts

// Here we only store the centrally used, relevant contract addresses.
// ABIs are imported directly from the /abis folder by components and hooks.

// CHESS token contract address
export const CHESS_TOKEN_ADDRESS_CONST = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';

// NEW treasury deposit contract address
export const TREASURY_DEPOSIT_ADDRESS_CONST = '0x6d1d60bbed4d75768db63761dc498c56e5e5bc6b';

// Optional: If you still need the old promotion contract address somewhere in the code
// (e.g. for querying old rewards), then keep it, but rename it clearly.
export const OLD_PROMO_CONTRACT_ADDRESS_CONST = '0xeca8a11700476863a976b841dc32e351acf6ed1f';


// Create an easy-to-use object for addresses
// that hooks and components can use.
export const CONTRACTS = {
  CHESS_TOKEN: CHESS_TOKEN_ADDRESS_CONST,
  TreasuryDeposit: TREASURY_DEPOSIT_ADDRESS_CONST,

  // FarcasterPromo is renamed to indicate it's the old system.
  // Only keep it if the claim logic still uses the old contract.
  FarcasterPromo_OLD: OLD_PROMO_CONTRACT_ADDRESS_CONST,
} as const;