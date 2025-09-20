const https = require('https');

// This script will call the migration API endpoint
async function runMigration() {
  try {
    console.log('🚀 Starting Weather Lotto migration via API...');
    
    const options = {
      hostname: 'farcaster-miniapp.vercel.app', // Replace with your actual Vercel domain
      port: 443,
      path: '/api/admin/run-migrations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if you have ADMIN_SECRET set
        // 'Authorization': 'Bearer your-admin-secret'
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
          console.log('📊 Migration Results:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.success) {
            console.log('✅ Migration completed successfully!');
          } else {
            console.log('❌ Migration failed:', result.error);
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
    console.error('❌ Migration script failed:', error);
  }
}

runMigration();
