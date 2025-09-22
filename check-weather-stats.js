const https = require('https');

async function checkWeatherStats() {
  try {
    console.log('📊 Checking Weather Lotto stats...');
    
    const options = {
      hostname: 'farc-nu.vercel.app',
      port: 443,
      path: '/api/weather-lotto/stats',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('📊 Weather Lotto Stats:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success && result.stats) {
            console.log(`✅ Total rounds: ${result.stats.total_rounds}`);
            console.log(`🎫 Total tickets sold: ${result.stats.total_tickets_sold}`);
            console.log(`💰 Total volume: ${result.stats.total_volume}`);
            console.log(`🏆 Total payouts: ${result.stats.total_payouts}`);
            console.log(`🏦 Total treasury: ${result.stats.total_treasury}`);
            console.log(`☀️ Current sunny tickets: ${result.stats.current_sunny_tickets}`);
            console.log(`🌧️ Current rainy tickets: ${result.stats.current_rainy_tickets}`);
            console.log(`💰 Current total pool: ${result.stats.current_total_pool}`);
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

checkWeatherStats();
