const https = require('https');

// This script will debug the Weather Lotto database
async function debugWeatherDB() {
  try {
    console.log('🔍 Debugging Weather Lotto database...');
    
    const options = {
      hostname: 'farcaster-miniapp.vercel.app', // Replace with your actual Vercel domain
      port: 443,
      path: '/api/weather-lotto/debug',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('📊 Debug Results:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log('✅ Database debug successful!');
            console.log('📋 Tables:', result.debug.tables);
            console.log('🎯 Rounds:', result.debug.rounds.length);
            console.log('📊 Stats:', result.debug.stats ? 'Found' : 'Not found');
            console.log('🎫 Total tickets:', result.debug.total_tickets);
          } else {
            console.log('❌ Debug failed:', result.error);
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
    console.error('❌ Debug script failed:', error);
  }
}

debugWeatherDB();
