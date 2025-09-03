// Chess Lotto Smart Contract ABI
export const CHESS_LOTTO_ADDRESS = '0x0000000000000000000000000000000000000000' as const; // Placeholder address

export const ChessLottoAbi = [
  // View functions
  {
    "inputs": [],
    "name": "jackpot",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ticketPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextDrawTime",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserTickets",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "uint8[6]", "name": "numbers", "type": "uint8[6]" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "bool", "name": "isWinner", "type": "bool" }
        ],
        "internalType": "struct ChessLotto.Ticket[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWinningNumbers",
    "outputs": [{ "internalType": "uint8[6]", "name": "", "type": "uint8[6]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserWinnings",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint8[6]", "name": "numbers", "type": "uint8[6]" }],
    "name": "buyTicket",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "drawWinningNumbers",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimWinnings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "ticketId", "type": "uint256" },
      { "indexed": false, "internalType": "uint8[6]", "name": "numbers", "type": "uint8[6]" }
    ],
    "name": "TicketPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint8[6]", "name": "winningNumbers", "type": "uint8[6]" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "DrawCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "WinningsClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "newJackpot", "type": "uint256" }
    ],
    "name": "JackpotUpdated",
    "type": "event"
  }
] as const;

// Prize structure constants
export const LOTTO_PRIZES = {
  SIX_MATCHES: 0.4,    // 40% of jackpot
  FIVE_MATCHES: 0.2,   // 20% of jackpot
  FOUR_MATCHES: 0.1,   // 10% of jackpot
  THREE_MATCHES: 2,    // 2x ticket price
  TWO_MATCHES: 0.5     // 0.5x ticket price
} as const;

// Game configuration
export const LOTTO_CONFIG = {
  NUMBERS_TO_SELECT: 6,
  MAX_NUMBER: 49,
  MAX_TICKETS_PER_USER: 10,
  DRAW_INTERVAL: 3600, // 1 hour in seconds
  BASE_JACKPOT: 10000  // 10,000 CHESS tokens
} as const;
