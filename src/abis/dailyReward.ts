// DailyReward contract ABI and address
export const DAILY_REWARD_ADDRESS = '0xa5c59fb76f3e2012dfd572739b9d5516034f1ff8' as const;

export const DAILY_REWARD_ABI = [
  {
    "inputs": [
      { "name": "recipient", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "nonce", "type": "uint256" },
      { "name": "signature", "type": "bytes" }
    ],
    "name": "claimWithSignature",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "user", "type": "address" }],
    "name": "nonces",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dailyRewardAmount",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "signer",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;