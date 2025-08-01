// Contract addresses on Base mainnet
export const CONTRACTS = {
  FarcasterPromo: "0x439f17d5b1b1076c04f9a1d36a3a5df3346ddb98",
  CHESS_TOKEN: "0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07", // CHESS token on Base
} as const

// Network configuration
export const NETWORKS = {
  BASE_MAINNET: {
    chainId: 8453,
    name: "Base Mainnet",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
  },
} as const 