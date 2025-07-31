const { Pool } = require('pg');

// Test database connection
async function testConnection() {
  console.log('🔍 Testing Neon database connection...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query test successful!');
    console.log('📅 Current database time:', result.rows[0].current_time);
    
    // Test tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📊 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Test promotions table
    const promotionsResult = await client.query('SELECT COUNT(*) as count FROM promotions');
    console.log(`📈 Promotions count: ${promotionsResult.rows[0].count}`);
    
    client.release();
    await pool.end();
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Tip: Check if DATABASE_URL is correct');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Tip: Check if the database is accessible');
    } else if (error.code === '28P01') {
      console.error('💡 Tip: Check username/password in DATABASE_URL');
    }
    
    process.exit(1);
  }
}

// Run test
testConnection(); 