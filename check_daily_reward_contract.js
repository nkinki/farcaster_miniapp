// Script a DailyReward szerződés ellenőrzésére
require('dotenv').config();
const { createPublicClient, http, formatEther } = require('viem');
const { base } = require('viem/chains');

const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

const DAILY_REWARD_ADDRESS = '0xa5c59fb76f3e2012dfd572739b9d5516034f1ff8';
const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';

async function checkDailyRewardContract() {
  try {
    console.log('🔍 Checking DailyReward contract...\n');
    console.log('DailyReward address:', DAILY_REWARD_ADDRESS);
    console.log('CHESS token address:', CHESS_TOKEN_ADDRESS);
    
    // ETH egyenleg ellenőrzése
    console.log('\n📊 ETH Balance:');
    const ethBalance = await publicClient.getBalance({
      address: DAILY_REWARD_ADDRESS
    });
    console.log(`DailyReward ETH balance: ${formatEther(ethBalance)} ETH`);
    
    // CHESS token egyenleg ellenőrzése
    console.log('\n📊 CHESS Token Balance:');
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
        args: [DAILY_REWARD_ADDRESS]
      });
      
      console.log(`DailyReward CHESS balance: ${formatEther(chessBalance)} CHESS`);
      
      if (chessBalance === 0n) {
        console.log('❌ PROBLÉMA: A DailyReward szerződésnek nincs CHESS token-je!');
        console.log('💡 MEGOLDÁS: Küldj CHESS token-eket a DailyReward címére');
      } else {
        console.log('✅ CHESS token egyenleg rendben van');
        
        // Hány claim-et tud kifizetni (10,000 CHESS per claim)
        const dailyRewardAmount = 10000n * (10n ** 18n); // 10,000 CHESS in wei
        const possibleClaims = chessBalance / dailyRewardAmount;
        console.log(`💰 Possible claims: ${possibleClaims.toString()} (10,000 CHESS each)`);
      }
      
    } catch (tokenError) {
      console.log('⚠️  Nem sikerült lekérdezni a CHESS token egyenleget');
      console.log('Hiba:', tokenError.message);
    }
    
    // Próbáljuk meg ellenőrizni a szerződés funkcióit
    console.log('\n🔧 Contract Functions Check:');
    
    // Alapvető szerződés ellenőrzés
    const code = await publicClient.getBytecode({
      address: DAILY_REWARD_ADDRESS
    });
    
    if (code && code !== '0x') {
      console.log('✅ DailyReward szerződés telepítve és működik');
      console.log(`📝 Bytecode length: ${code.length} characters`);
    } else {
      console.log('❌ PROBLÉMA: Nincs szerződés ezen a címen!');
    }
    
    console.log('\n💡 KÖVETKEZŐ LÉPÉSEK:');
    console.log('1. Ellenőrizd a DailyReward szerződés ABI-ját');
    console.log('2. Módosítsd a generate-claim-signature API-t a DailyReward címre');
    console.log('3. Frissítsd a frontend-et a DailyReward szerződés használatára');
    
  } catch (error) {
    console.error('❌ Hiba a DailyReward szerződés ellenőrzésekor:', error.message);
  }
}

checkDailyRewardContract();