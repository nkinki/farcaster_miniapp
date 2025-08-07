const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  if (!process.env.NEON_DB_URL) {
    console.error('NEON_DB_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.NEON_DB_URL);
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/005_add_payouts_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 005_add_payouts_table.sql');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await sql`${statement.trim()}`;
      }
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();