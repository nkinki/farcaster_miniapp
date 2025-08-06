// Test script a DailyReward API tesztelésére
require('dotenv').config();

async function testDailyRewardAPI() {
  try {
    console.log('🧪 Testing DailyReward API...\n');
    
    // Test adatok
    const testFID = 123456; // Cseréld le egy valós FID-re
    const testAddress = '0x1234567890123456789012345678901234567890'; // Test wallet cím
    const dailyRewardAddress = '0xa5c59fb76f3e2012dfd572739b9d5516034f1ff8';
    
    console.log('Test parameters:');
    console.log('FID:', testFID);
    console.log('Recipient:', testAddress);
    console.log('Contract:', dailyRewardAddress);
    console.log('Amount: 10000 CHESS\n');
    
    // 1. Teszteljük a generate-claim-signature API-t DailyReward módban
    console.log('📝 Testing generate-claim-signature API...');
    
    const sigResponse = await fetch('http://localhost:3000/api/generate-claim-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fid: testFID,
        recipientAddress: testAddress,
        contractAddress: dailyRewardAddress,
        amount: "10000"
      })
    });
    
    const sigResult = await sigResponse.json();
    
    console.log('Response status:', sigResponse.status);
    console.log('Response body:', JSON.stringify(sigResult, null, 2));
    
    if (sigResponse.ok) {
      console.log('✅ DailyReward signature generation works!');
      console.log('Signature length:', sigResult.signature?.length);
      console.log('Amount:', sigResult.amount);
      console.log('Nonce:', sigResult.nonce);
      
      // 2. Ellenőrizzük a signature formátumát
      if (sigResult.signature && sigResult.signature.startsWith('0x') && sigResult.signature.length === 132) {
        console.log('✅ Signature format is correct');
      } else {
        console.log('❌ Signature format might be incorrect');
      }
      
    } else {
      console.log('❌ DailyReward signature generation failed:', sigResult.error);
      console.log('Details:', sigResult.details);
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. If signature generation works: Test with real wallet in frontend');
    console.log('2. If it fails: Check backend wallet authorization in DailyReward contract');
    console.log('3. Try the DailyReward test component in the frontend');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Várunk egy kicsit, hogy a szerver elinduljon
setTimeout(testDailyRewardAPI, 3000);