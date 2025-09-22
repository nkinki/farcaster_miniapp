const https = require('https');

async function checkWeatherLotto() {
  try {
    console.log('🌤️ Checking Weather Lotto status...');
    
    // Check current round
    const currentRoundOptions = {
      hostname: 'farc-nu.vercel.app',
      port: 443,
      path: '/api/weather-lotto/current-round',
      method: 'GET'
    };

    const req1 = https.request(currentRoundOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('📊 Current Round:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success && result.round) {
            console.log(`✅ Active round: #${result.round.round_number}`);
            console.log(`☀️ Sunny tickets: ${result.round.sunny_tickets}`);
            console.log(`🌧️ Rainy tickets: ${result.round.rainy_tickets}`);
            console.log(`💰 Total pool: ${result.round.total_pool}`);
            console.log(`⏰ End time: ${result.round.end_time}`);
          } else {
            console.log('❌ No active round found');
          }
        } catch (error) {
          console.log('📄 Raw response:', data);
        }
      });
    });
    
    req1.on('error', (error) => { 
      console.error('❌ Request failed:', error); 
    });
    
    req1.end();
    
  } catch (error) {
    console.error('❌ Check script failed:', error);
  }
}

checkWeatherLotto();
