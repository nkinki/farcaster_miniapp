const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Try loading from multiple sources
console.log('🔄 Loading environment variables...');
dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) dotenv.config({ path: '.env.production' });
if (!process.env.DATABASE_URL) dotenv.config({ path: '.env' });

console.log('Database URL found:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in any .env file');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, 'migrations', '019_unify_promotion_types.sql');
        console.log(`📄 Reading migration: ${migrationPath}`);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Executing migration...');
        await pool.query(migrationSQL);

        console.log(`✅ Migration 019 completed successfully!`);

        // Also log it to the database table if possible
        try {
            await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations_log (
          id SERIAL PRIMARY KEY,
          migration_file VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

            await pool.query(
                'INSERT INTO migrations_log (migration_file) VALUES ($1) ON CONFLICT DO NOTHING',
                ['019_unify_promotion_types.sql']
            );
            console.log('📝 Logged to migrations_log table');
        } catch (logError) {
            console.warn('⚠️ Could not log to migrations_log table (minor issue):', logError.message);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
