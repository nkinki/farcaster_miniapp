const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database tables...');
    
    // Check what tables exist
    const { rows: tables } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Existing tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Check if our specific tables exist
    const targetTables = [
      'like_recast_user_actions',
      'like_recast_completions', 
      'manual_verifications'
    ];
    
    console.log('\n🎯 Checking target tables:');
    for (const tableName of targetTables) {
      const exists = tables.some(t => t.table_name === tableName);
      console.log(`  ${tableName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
    // If tables exist, show their structure
    console.log('\n🔍 Table structures:');
    for (const tableName of targetTables) {
      if (tables.some(t => t.table_name === tableName)) {
        const { rows: columns } = await pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`\n📊 ${tableName}:`);
        columns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();