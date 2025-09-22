const https = require('https');

async function testManualDraw() {
  try {
    console.log('🎲 Testing manual Weather Lotto draw...');
    
    const options = {
      hostname: 'farc-nu.vercel.app',
      port: 443,
      path: '/api/weather-lotto/draw-winner',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('📊 Manual Draw Test Results:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log('✅ Manual draw successful!');
            console.log(`🏆 Winning side: ${result.round.winning_side}`);
            console.log(`🎫 Total tickets: ${result.round.total_tickets}`);
            console.log(`👥 Winners count: ${result.round.winners_count}`);
            console.log(`💰 Winners pool: ${result.round.winners_pool}`);
            console.log(`🏦 Treasury amount: ${result.round.treasury_amount}`);
          } else {
            console.log('❌ Manual draw failed:', result.error);
          }
        } catch (error) {
          console.log('📄 Raw response:', data);
        }
      });
    });
    
    req.on('error', (error) => { 
      console.error('❌ Request failed:', error); 
    });
    
    req.end();
  } catch (error) {
    console.error('❌ Test script failed:', error);
  }
}

testManualDraw();
