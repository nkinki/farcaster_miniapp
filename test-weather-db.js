const { Pool } = require('pg');

// This script will test the Weather Lotto database connection and create tables
async function testWeatherDB() {
  // You'll need to set this environment variable temporarily
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.log('❌ DATABASE_URL not found. Please set it temporarily:');
    console.log('   set DATABASE_URL=your_neon_connection_string');
    console.log('   or export DATABASE_URL=your_neon_connection_string');
    return;
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 Testing Weather Lotto database connection...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Check if Weather Lotto tables exist
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'weather_lotto_%'
    `);
    
    console.log('📊 Existing Weather Lotto tables:', tables.map(t => t.table_name));
    
    if (tables.length === 0) {
      console.log('📝 No Weather Lotto tables found. Creating them...');
      
      // Read and execute the migration
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, 'migrations', '012_create_weather_lotto.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      await client.query(migrationSQL);
      console.log('✅ Weather Lotto tables created successfully!');
      
      // Verify tables were created
      const { rows: newTables } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'weather_lotto_%'
      `);
      
      console.log('📊 New Weather Lotto tables:', newTables.map(t => t.table_name));
      
    } else {
      console.log('✅ Weather Lotto tables already exist!');
    }
    
    // Test inserting a sample round
    console.log('🧪 Testing sample data insertion...');
    
    const { rows: existingRounds } = await client.query(
      'SELECT COUNT(*) as count FROM weather_lotto_rounds'
    );
    
    if (parseInt(existingRounds[0].count) === 0) {
      await client.query(`
        INSERT INTO weather_lotto_rounds (
          round_number, 
          status, 
          house_base, 
          total_pool,
          end_time
        ) VALUES (
          1, 
          'active', 
          200000000000000000000000, 
          200000000000000000000000,
          NOW() + INTERVAL '1 day'
        )
      `);
      console.log('✅ Sample round created!');
    } else {
      console.log('✅ Rounds already exist!');
    }
    
    client.release();
    console.log('🎉 Weather Lotto database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testWeatherDB();
