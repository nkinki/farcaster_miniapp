const https = require('https');

async function createNewWeatherRound() {
  try {
    console.log('🎯 Creating new Weather Lotto round...');
    
    const options = {
      hostname: 'farc-nu.vercel.app',
      port: 443,
      path: '/api/weather-lotto/create-round',
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
          console.log('📊 Create Round Results:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log('✅ New Weather Lotto round created successfully!');
            console.log(`🎯 Round #${result.round.round_number}`);
            console.log(`⏰ End time: ${result.round.end_time}`);
            console.log(`💰 House base: ${result.round.house_base}`);
          } else {
            console.log('❌ Failed to create round:', result.error);
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
    console.error('❌ Create round script failed:', error);
  }
}

createNewWeatherRound();
