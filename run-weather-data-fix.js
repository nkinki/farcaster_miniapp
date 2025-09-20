const https = require('https');

async function fixWeatherData() {
  try {
    console.log('🔧 Fixing Weather Lotto database data...');
    
    const options = {
      hostname: 'farcaster-miniapp.vercel.app', // Replace with your actual Vercel domain
      port: 443,
      path: '/api/weather-lotto/fix-data',
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
          console.log('📊 Weather Lotto Data Fix Results:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log('✅ Weather Lotto database data fixed successfully!');
          } else {
            console.log('❌ Data fix failed:', result.error);
          }
        } catch (error) {
          console.log('📄 Raw response:', data);
        }
      });
    });
    req.on('error', (error) => { console.error('❌ Request failed:', error); });
    req.end();
  } catch (error) {
    console.error('❌ Data fix script failed:', error);
  }
}

fixWeatherData();
