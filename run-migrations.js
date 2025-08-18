const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Environment check:');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = [
      '006_add_action_type.sql',
      '007_create_like_recast_actions.sql'
    ];
    
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migration file ${file} not found, skipping...`);
        continue;
      }
      
      console.log(`📄 Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute the entire migration file as one statement
      // This prevents issues with semicolons inside CREATE TABLE statements
      console.log(`   Executing migration file: ${file}`);
      await pool.query(migrationSQL);
      
      console.log(`✅ Migration ${file} completed successfully`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();