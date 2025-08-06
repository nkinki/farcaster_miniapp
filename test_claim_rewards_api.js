// Test script a claim-rewards API tesztelésére
require('dotenv').config();

async function testClaimRewardsAPI() {
  try {
    console.log('🧪 Testing claim-rewards API...\n');
    
    // Test FID - használj egy valós FID-et ami van az adatbázisban
    const testFID = 123456; // Cseréld le egy valós FID-re
    
    const response = await fetch('http://localhost:3000/api/claim-rewards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fid: testFID
      })
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Claim rewards API működik!');
      console.log('Transaction hash:', result.transactionHash);
    } else {
      console.log('❌ Claim rewards API hiba:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test hiba:', error.message);
  }
}

// Először ellenőrizzük, hogy fut-e a szerver
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/check-env');
    if (response.ok) {
      console.log('✅ Szerver fut, tesztelhetjük az API-t\n');
      await testClaimRewardsAPI();
    } else {
      console.log('❌ Szerver nem fut. Indítsd el: npm run dev');
    }
  } catch (error) {
    console.log('❌ Szerver nem elérhető. Indítsd el: npm run dev');
  }
}

checkServer();