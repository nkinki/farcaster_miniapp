import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: NextRequest) {
  try {
    // Security check - only allow from admin or with secret
    const authHeader = request.headers.get('authorization');
    if (process.env.ADMIN_SECRET && authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('🚀 Starting database migrations via API...');
    
    // Create migrations_log table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations_log (
        id SERIAL PRIMARY KEY,
        migration_file VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
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
    
    const results = [];
    
    for (const file of migrationFiles) {
      // Skip if already executed
      if (executedFiles.includes(file)) {
        console.log(`⏭️  Skipping already executed migration: ${file}`);
        results.push({ file, status: 'skipped', message: 'Already executed' });
        continue;
      }
      
      const migrationPath = path.join(migrationsDir, file);
      
      console.log(`📄 Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        // Execute the entire migration file as one statement
        console.log(`   Executing migration file: ${file}`);
        await pool.query(migrationSQL);
        
        // Log the successful migration
        await pool.query(
          'INSERT INTO migrations_log (migration_file) VALUES ($1)',
          [file]
        );
        
        console.log(`✅ Migration ${file} completed successfully`);
        results.push({ file, status: 'success', message: 'Completed successfully' });
      } catch (error: any) {
        console.error(`❌ Migration ${file} failed:`, error.message);
        results.push({ file, status: 'error', message: error.message });
      }
    }
    
    console.log('🎉 Migration process completed!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration process completed',
      results 
    });
    
  } catch (error: any) {
    console.error('❌ Migration API failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
