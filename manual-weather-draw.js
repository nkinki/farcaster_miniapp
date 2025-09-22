const https = require('https');

async function manualWeatherDraw() {
  try {
    console.log('🎲 Triggering manual Weather Lotto draw...');
    
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
          console.log('📊 Manual Draw Results:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log('✅ Weather Lotto draw completed successfully!');
            console.log(`🏆 Winning side: ${result.winningSide}`);
            console.log(`💰 Winners pool: ${result.winnersPool}`);
            console.log(`🏦 Treasury amount: ${result.treasuryAmount}`);
          } else {
            console.log('❌ Draw failed:', result.error);
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
    console.error('❌ Manual draw script failed:', error);
  }
}

manualWeatherDraw();
