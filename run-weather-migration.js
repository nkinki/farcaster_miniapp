const https = require('https');

async function runMigration() {
  const data = JSON.stringify({
    migrationName: 'add_transaction_hash'
  });

  const options = {
    hostname: 'farc-nu.vercel.app',
    port: 443,
    path: '/api/weather-lotto/run-migration',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (res.statusCode === 200) {
            console.log('✅ Migration successful:', result);
            resolve(result);
          } else {
            console.error('❌ Migration failed:', result);
            reject(new Error(result.error || 'Migration failed'));
          }
        } catch (error) {
          console.error('❌ Failed to parse response:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  });