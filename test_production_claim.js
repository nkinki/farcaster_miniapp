// Script a production claim funkció tesztelésére
const https = require('https');

async function testProductionClaim() {
  const VERCEL_URL = 'https://farc-nu.vercel.app';
  
  try {
    console.log('🔍 Testing production claim signature generation...');
    
    // Test adatok - használjunk egy valódi FID-et és wallet címet
    const testData = {
      fid: 3, // Dan Romero FID-je (ismert Farcaster felhasználó)
      recipientAddress: '0xe156390D3666a5cd996E0b1b070cd52c4fd15787' // A signer wallet címe
    };
    
    console.log('Test data:', testData);
    
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'farc-nu.vercel.app',
      port: 443,
      path: '/api/generate-claim-signature',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    console.log('Response status:', response.status);
    console.log('Response body:', response.data);
    
    if (response.status === 200) {
      try {
        const data = JSON.parse(response.data);
        console.log('\n✅ SUCCESS! Signature generated:');
        console.log('Signature:', data.signature);
        console.log('Amount:', data.amount);
        console.log('Nonce:', data.nonce);
        
        // Ellenőrizzük a signature hosszát
        if (data.signature && data.signature.length === 132) { // 0x + 130 karakter
          console.log('✅ Signature length is correct (132 characters)');
        } else {
          console.log('⚠️ Signature length might be incorrect:', data.signature?.length);
        }
        
      } catch (parseError) {
        console.log('✅ Response received but not JSON:', response.data);
      }
    } else {
      console.log('❌ FAILED! Error response:');
      try {
        const errorData = JSON.parse(response.data);
        console.log('Error:', errorData);
      } catch {
        console.log('Raw error:', response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testProductionClaim();