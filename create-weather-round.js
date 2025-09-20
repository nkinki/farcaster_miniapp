const https = require('https');

// This script will create a new Weather Lotto round
async function createWeatherRound() {
  try {
    console.log('🎯 Creating new Weather Lotto round...');
    
    const options = {
      hostname: 'farcaster-miniapp.vercel.app', // Replace with your actual Vercel domain
      port: 443,
      path: '/api/weather-lotto/create-round',
      method: 'POST',
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
          console.log('📊 Create Round Results:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log('✅ Weather Lotto round created successfully!');
            console.log('🎯 Round Number:', result.round?.round_number);
            console.log('⏰ End Time:', result.round?.end_time);
          } else {
            console.log('❌ Round creation failed:', result.error);
            if (result.error === 'Active round already exists') {
              console.log('ℹ️  There is already an active round');
            }
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

createWeatherRound();
