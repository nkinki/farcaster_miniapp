const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runSpecificMigration() {
    try {
        console.log('🚀 Running migration 016 manually...');

        const migrationPath = path.join(__dirname, 'migrations', '016_create_daily_code_usages.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await pool.query(migrationSQL);

        console.log('✅ Migration 016 executed successfully!');

        // Try to update log if possible, but don't fail if it errors
        try {
            await pool.query(
                'INSERT INTO migrations_log (migration_file) VALUES ($1) ON CONFLICT DO NOTHING',
                ['016_create_daily_code_usages.sql']
            );
            console.log('📝 Log updated.');
        } catch (e) {
            console.log('⚠️ Could not update migration log (minor issue).');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

runSpecificMigration();
