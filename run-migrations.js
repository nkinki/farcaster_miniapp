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
    
    // Create migrations_log table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations_log (
        id SERIAL PRIMARY KEY,
        migration_file VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Only run migrations from 006 onwards (skip problematic old ones)
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => parseInt(file.split('_')[0]) >= 6) // Only 006, 007, 008, etc.
      .sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files to run:`, migrationFiles);
    
    // Get already executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT migration_file FROM migrations_log'
    );
    const executedFiles = executedMigrations.map(row => row.migration_file);
    
    console.log(`📋 Already executed migrations:`, executedFiles);
    
    for (const file of migrationFiles) {
      // Skip if already executed
      if (executedFiles.includes(file)) {
        console.log(`⏭️  Skipping already executed migration: ${file}`);
        continue;
      }
      
      const migrationPath = path.join(migrationsDir, file);
      
      console.log(`📄 Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute the entire migration file as one statement
      // This prevents issues with semicolons inside CREATE TABLE statements
      console.log(`   Executing migration file: ${file}`);
      await pool.query(migrationSQL);
      
      // Log the successful migration
      await pool.query(
        'INSERT INTO migrations_log (migration_file) VALUES ($1)',
        [file]
      );
      
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