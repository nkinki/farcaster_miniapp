import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    // Security check - only in production
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Migration can only be run in production' }, { status: 403 });
    }

    // Admin key check
    const { adminKey } = await request.json();
    if (adminKey !== process.env.ADMIN_MIGRATION_KEY) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 });
    }

    console.log('🚀 Starting comment columns migration...');
    
    // Create migrations_log table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS migrations_log (
        id SERIAL PRIMARY KEY,
        migration_file VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Check if migration is already executed
    const executedMigrations = await sql`
      SELECT migration_file FROM migrations_log WHERE migration_file = '013_add_comment_columns.sql'
    `;
    
    if (executedMigrations.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Migration 013_add_comment_columns.sql already executed'
      });
    }
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '013_add_comment_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`📄 Running migration: 013_add_comment_columns.sql`);
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    // Log the successful migration
    await sql`
      INSERT INTO migrations_log (migration_file) VALUES ('013_add_comment_columns.sql')
    `;
    
    console.log(`✅ Migration 013_add_comment_columns.sql completed successfully`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration 013_add_comment_columns.sql completed successfully'
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if migration is already executed
    const executedMigrations = await sql`
      SELECT migration_file, executed_at FROM migrations_log 
      WHERE migration_file = '013_add_comment_columns.sql'
      ORDER BY executed_at DESC
    `;
    
    return NextResponse.json({ 
      success: true, 
      executedMigrations,
      isExecuted: executedMigrations.length > 0
    });

  } catch (error: any) {
    console.error('❌ Failed to get migration status:', error);
    return NextResponse.json({ 
      error: 'Failed to get migration status', 
      details: error.message 
    }, { status: 500 });
  }
}
