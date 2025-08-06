// Script a szerződés egyenlegeinek ellenőrzésére
require('dotenv').config();
const { createPublicClient, http, formatEther, parseEther } = require('viem');
const { base } = require('viem/chains');

const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

const REWARDS_CLAIM_ADDRESS = '0xb8d08800d79850375c10a96e87fd196c0e52aa5a';
const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';

async function checkBalances() {
  try {
    console.log('🔍 Checking contract balances...\n');
    
    // ETH egyenleg ellenőrzése
    console.log('📊 ETH Balance:');
    const ethBalance = await publicClient.getBalance({
      address: REWARDS_CLAIM_ADDRESS
    });
    console.log(`Contract ETH balance: ${formatEther(ethBalance)} ETH`);
    
    if (ethBalance === 0n) {
      console.log('❌ PROBLÉMA: A szerződésnek nincs ETH-je gas fee-khez!');
      console.log('💡 MEGOLDÁS: Küldj ETH-t a szerződés címére: ' + REWARDS_CLAIM_ADDRESS);
    } else if (ethBalance < parseEther('0.001')) {
      console.log('⚠️  FIGYELEM: Kevés ETH van a szerződésben gas fee-khez');
      console.log('💡 JAVASLAT: Küldj több ETH-t a szerződés címére');
    } else {
      console.log('✅ ETH egyenleg rendben van');
    }
    
    console.log('\n📊 CHESS Token Balance:');
    
    // CHESS token egyenleg (ha van ABI)
    const chessTokenABI = [
      {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    try {
      const chessBalance = await publicClient.readContract({
        address: CHESS_TOKEN_ADDRESS,
        abi: chessTokenABI,
        functionName: 'balanceOf',
        args: [REWARDS_CLAIM_ADDRESS]
      });
      
      console.log(`Contract CHESS balance: ${formatEther(chessBalance)} CHESS`);
      
      if (chessBalance === 0n) {
        console.log('❌ PROBLÉMA: A szerződésnek nincs CHESS token-je!');
      } else {
        console.log('✅ CHESS token egyenleg rendben van');
      }
      
    } catch (tokenError) {
      console.log('⚠️  Nem sikerült lekérdezni a CHESS token egyenleget');
      console.log('Hiba:', tokenError.message);
    }
    
    console.log('\n💡 MEGOLDÁSI JAVASLATOK:');
    console.log('1. Küldj 0.01-0.1 ETH-t a szerződés címére gas fee-khez');
    console.log('2. Ellenőrizd, hogy van-e elég CHESS token a szerződésben');
    console.log('3. Ha approve-ot használsz, ellenőrizd az allowance-t');
    
  } catch (error) {
    console.error('❌ Hiba az egyenlegek ellenőrzésekor:', error.message);
  }
}

checkBalances();