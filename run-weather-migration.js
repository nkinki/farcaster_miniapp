const https = require('https');

// This script will call the Weather Lotto database setup API endpoint
async function setupWeatherDB() {
  try {
    console.log('🚀 Setting up Weather Lotto database via API...');
    
    const options = {
      hostname: 'farcaster-miniapp.vercel.app', // Replace with your actual Vercel domain
      port: 443,
      path: '/api/weather-lotto/setup-db',
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
          console.log('📊 Weather Lotto Database Setup Results:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success) {
            if (result.status === 'created') {
              console.log('✅ Weather Lotto database created successfully!');
              console.log('📊 Created tables:', result.tables.join(', '));
            } else if (result.status === 'already_exists') {
              console.log('✅ Weather Lotto database already exists!');
            }
          } else {
            console.log('❌ Database setup failed:', result.error);
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
    console.error('❌ Database setup script failed:', error);
  }
}

setupWeatherDB();
