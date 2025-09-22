const https = require('https');

async function checkStatsTable() {
  try {
    console.log('📊 Checking weather_lotto_stats table...');
    
    const options = {
      hostname: 'farc-nu.vercel.app',
      port: 443,
      path: '/api/weather-lotto/debug',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('📊 Weather Lotto Debug Data:');
          
          if (result.weather_lotto_stats && result.weather_lotto_stats.length > 0) {
            console.log('✅ Stats table has data:');
            console.log(JSON.stringify(result.weather_lotto_stats[0], null, 2));
          } else {
            console.log('❌ Stats table is empty or missing!');
          }
          
          if (result.weather_lotto_rounds && result.weather_lotto_rounds.length > 0) {
            console.log('\n📋 Rounds:');
            result.weather_lotto_rounds.forEach((round, index) => {
              console.log(`${index + 1}. Round #${round.round_number} - Status: ${round.status} - Tickets: ${round.total_tickets}`);
            });
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
    console.error('❌ Check script failed:', error);
  }
}

checkStatsTable();
