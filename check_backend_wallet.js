// Script a backend wallet egyenlegének ellenőrzésére
const { createPublicClient, http, formatUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');

// Environment változók (helyettesítsd be a valódi értékekkel)
const BACKEND_WALLET_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY;

if (!BACKEND_WALLET_PRIVATE_KEY) {
  console.error('❌ BACKEND_WALLET_PRIVATE_KEY environment variable not set!');
  console.log('Please set it in your .env.local file');
  process.exit(1);
}

async function checkBackendWallet() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  try {
    const signerAccount = privateKeyToAccount(BACKEND_WALLET_PRIVATE_KEY);
    
    console.log('🔍 Checking backend wallet balance...');
    console.log('Wallet address:', signerAccount.address);
    
    // ETH egyenleg
    const ethBalance = await publicClient.getBalance({
      address: signerAccount.address
    });
    
    const ethBalanceFormatted = formatUnits(ethBalance, 18);
    console.log('\n📊 Backend Wallet Balance:');
    console.log('ETH balance:', ethBalanceFormatted, 'ETH');
    
    if (parseFloat(ethBalanceFormatted) === 0) {
      console.log('❌ CRITICAL: Backend wallet has 0 ETH!');
      console.log('   The backend wallet needs ETH to sign transactions.');
    } else if (parseFloat(ethBalanceFormatted) < 0.001) {
      console.log('⚠️  WARNING: Backend wallet has very low ETH balance!');
    } else {
      console.log('✅ Backend wallet has sufficient ETH.');
    }

    // Chess token egyenleg is
    const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';
    const CHESS_TOKEN_ABI = [
      {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
    ];

    const chessBalance = await publicClient.readContract({
      address: CHESS_TOKEN_ADDRESS,
      abi: CHESS_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [signerAccount.address]
    });

    const chessBalanceFormatted = formatUnits(chessBalance, 18);
    console.log('CHESS balance:', chessBalanceFormatted, 'CHESS');

  } catch (error) {
    console.error('❌ Error checking backend wallet:', error.message);
  }
}

checkBackendWallet();