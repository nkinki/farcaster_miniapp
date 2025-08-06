// Test script a DailyReward szerződés claimWithSignature funkciójának tesztelésére
require('dotenv').config();
const { createPublicClient, createWalletClient, http, parseEther } = require('viem');
const { base } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');

const DAILY_REWARD_ADDRESS = '0xa5c59fb76f3e2012dfd572739b9d5516034f1ff8';
const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';

// DailyReward ABI (alapvető funkciók)
const DAILY_REWARD_ABI = [
  {
    "inputs": [
      {"name": "recipient", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "nonce", "type": "uint256"},
      {"name": "signature", "type": "bytes"}
    ],
    "name": "claimWithSignature",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "nonces",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dailyRewardAmount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "signer",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testDailyRewardContract() {
  try {
    console.log('🧪 Testing DailyReward contract functions...\n');
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    });
    
    // 1. Ellenőrizzük a szerződés alapvető adatait
    console.log('📊 Contract Info:');
    console.log('DailyReward address:', DAILY_REWARD_ADDRESS);
    
    try {
      // Daily reward amount lekérdezése
      const dailyAmount = await publicClient.readContract({
        address: DAILY_REWARD_ADDRESS,
        abi: DAILY_REWARD_ABI,
        functionName: 'dailyRewardAmount'
      });
      console.log('Daily reward amount:', (Number(dailyAmount) / 1e18).toFixed(0), 'CHESS');
      
      // Signer address lekérdezése
      const signerAddress = await publicClient.readContract({
        address: DAILY_REWARD_ADDRESS,
        abi: DAILY_REWARD_ABI,
        functionName: 'signer'
      });
      console.log('Authorized signer:', signerAddress);
      
      // Backend wallet címe
      if (process.env.BACKEND_WALLET_PRIVATE_KEY) {
        const backendAccount = privateKeyToAccount(process.env.BACKEND_WALLET_PRIVATE_KEY);
        console.log('Backend wallet:', backendAccount.address);
        
        if (signerAddress.toLowerCase() === backendAccount.address.toLowerCase()) {
          console.log('✅ Backend wallet is authorized signer!');
        } else {
          console.log('❌ Backend wallet is NOT the authorized signer!');
          console.log('💡 The contract signer needs to be:', backendAccount.address);
        }
      }
      
      // Test user nonce lekérdezése
      const testUserAddress = '0x1234567890123456789012345678901234567890'; // Dummy address
      const userNonce = await publicClient.readContract({
        address: DAILY_REWARD_ADDRESS,
        abi: DAILY_REWARD_ABI,
        functionName: 'nonces',
        args: [testUserAddress]
      });
      console.log('Test user nonce:', userNonce.toString());
      
    } catch (contractError) {
      console.log('⚠️  Contract function call error:', contractError.message);
      console.log('This might mean the ABI is incorrect or the contract has different functions');
    }
    
    // 2. CHESS token egyenleg ellenőrzése
    console.log('\n💰 Token Balance Check:');
    const chessTokenABI = [
      {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    const chessBalance = await publicClient.readContract({
      address: CHESS_TOKEN_ADDRESS,
      abi: chessTokenABI,
      functionName: 'balanceOf',
      args: [DAILY_REWARD_ADDRESS]
    });
    
    const balanceInChess = Number(chessBalance) / 1e18;
    console.log(`DailyReward CHESS balance: ${balanceInChess.toFixed(0)} CHESS`);
    
    if (balanceInChess >= 10000) {
      console.log('✅ Contract has enough CHESS for claims!');
      const possibleClaims = Math.floor(balanceInChess / 10000);
      console.log(`💰 Possible claims: ${possibleClaims}`);
    } else {
      console.log('❌ Contract does not have enough CHESS for claims!');
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. If backend wallet is authorized signer: ✅ Ready to use!');
    console.log('2. If not: Need to update contract signer or use different wallet');
    console.log('3. Test the generate-claim-signature API with DailyReward');
    console.log('4. Create frontend component for DailyReward claims');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testDailyRewardContract();