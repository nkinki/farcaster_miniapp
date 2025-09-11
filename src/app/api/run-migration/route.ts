import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Adatbázis kapcsolat inicializálása
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: NextRequest) {
  try {
    // Biztonsági ellenőrzés - csak production környezetben
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Migration can only be run in production' }, { status: 403 });
    }

    // Admin kulcs ellenőrzése
    const { adminKey } = await request.json();
    if (adminKey !== process.env.ADMIN_MIGRATION_KEY) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 });
    }

    console.log('🚀 Starting database migration from API...');
    
    // Create migrations_log table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations_log (
        id SERIAL PRIMARY KEY,
        migration_file VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get already executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT migration_file FROM migrations_log'
    );
    const executedFiles = executedMigrations.map(row => row.migration_file);
    
    console.log(`📋 Already executed migrations:`, executedFiles);
    
    // Check if our migration is already executed
    if (executedFiles.includes('999_promotions_with_comments.sql')) {
      return NextResponse.json({ 
        success: true, 
        message: 'Migration 999_promotions_with_comments.sql already executed',
        executedMigrations: executedFiles
      });
    }
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '999_promotions_with_comments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`📄 Running migration: 999_promotions_with_comments.sql`);
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    // Log the successful migration
    await pool.query(
      'INSERT INTO migrations_log (migration_file) VALUES ($1)',
      ['999_promotions_with_comments.sql']
    );
    
    console.log(`✅ Migration 999_promotions_with_comments.sql completed successfully`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration 999_promotions_with_comments.sql completed successfully',
      executedMigrations: [...executedFiles, '999_promotions_with_comments.sql']
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get migration status
    const { rows: executedMigrations } = await pool.query(
      'SELECT migration_file, executed_at FROM migrations_log ORDER BY executed_at DESC'
    );
    
    return NextResponse.json({ 
      success: true, 
      executedMigrations,
      count: executedMigrations.length
    });

  } catch (error: any) {
    console.error('❌ Failed to get migration status:', error);
    return NextResponse.json({ 
      error: 'Failed to get migration status', 
      details: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}
