const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Environment check:');
console.log('NEON_DB_URL exists:', !!process.env.NEON_DB_URL);
console.log('NEON_DB_URL length:', process.env.NEON_DB_URL?.length || 0);

if (!process.env.NEON_DB_URL) {
  console.error('❌ NEON_DB_URL not found in environment variables');
  process.exit(1);
}

const sql = neon(process.env.NEON_DB_URL);

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
      
      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`   Executing: ${statement.substring(0, 60)}...`);
          await sql.unsafe(statement);
        }
      }
      
      console.log(`✅ Migration ${file} completed successfully`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();