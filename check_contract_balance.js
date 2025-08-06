// Script a rewardsClaim szerződés Chess token egyenlegének ellenőrzésére
const { createPublicClient, http, formatUnits } = require('viem');
const { base } = require('viem/chains');

// Szerződés címek
const REWARDS_CLAIM_ADDRESS = '0xb8d08800d79850375c10a96e87fd196c0e52aa5a';
const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';

// Chess token ABI (csak a balanceOf funkció)
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

async function checkContractBalance() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  try {
    console.log('🔍 Checking rewardsClaim contract Chess token balance...');
    console.log('Contract address:', REWARDS_CLAIM_ADDRESS);
    console.log('Chess token address:', CHESS_TOKEN_ADDRESS);
    
    // Lekérjük a szerződés Chess token egyenlegét
    const balance = await publicClient.readContract({
      address: CHESS_TOKEN_ADDRESS,
      abi: CHESS_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [REWARDS_CLAIM_ADDRESS]
    });

    const balanceFormatted = formatUnits(balance, 18);
    
    console.log('\n📊 Results:');
    console.log('Raw balance (wei):', balance.toString());
    console.log('Formatted balance:', balanceFormatted, 'CHESS');
    
    if (parseFloat(balanceFormatted) === 0) {
      console.log('⚠️  WARNING: Contract has 0 CHESS tokens!');
      console.log('   This could be the reason for claim failures.');
    } else if (parseFloat(balanceFormatted) < 100) {
      console.log('⚠️  WARNING: Contract has low CHESS token balance!');
    } else {
      console.log('✅ Contract has sufficient CHESS tokens.');
    }

    // Ellenőrizzük a szerződés ETH egyenlegét is
    const ethBalance = await publicClient.getBalance({
      address: REWARDS_CLAIM_ADDRESS
    });
    
    const ethBalanceFormatted = formatUnits(ethBalance, 18);
    console.log('ETH balance:', ethBalanceFormatted, 'ETH');
    
    if (parseFloat(ethBalanceFormatted) === 0) {
      console.log('⚠️  WARNING: Contract has 0 ETH for gas fees!');
    }

  } catch (error) {
    console.error('❌ Error checking contract balance:', error.message);
  }
}

checkContractBalance();