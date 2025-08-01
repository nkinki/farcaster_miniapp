// Contract addresses on Base mainnet
export const CONTRACTS = {
  FarcasterPromo: "0x439f17d5b1b1076c04f9a1d36a3a5df3346ddb98",
  CHESS_TOKEN: "0x650F44eD6F1FE0E1417cb4b3115d52494B4D9b6D", // CHESS token on Base
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