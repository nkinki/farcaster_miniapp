import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function POST() {
  try {
    console.log('Running database migration...');
    
    // Read all migration files
    const migrationsDir = join(process.cwd(), 'migrations');
    const migrationFiles = [
      '005_add_payouts_table.sql',
      '006_add_action_type.sql',
      '007_create_like_recast_actions.sql'
    ];
    
    let allMigrationSQL = '';
    for (const file of migrationFiles) {
      const migrationPath = join(migrationsDir, file);
      try {
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        allMigrationSQL += `\n-- Migration: ${file}\n${migrationSQL}\n`;
        console.log(`Loaded migration: ${file}`);
      } catch (error) {
        console.log(`Migration file ${file} not found, skipping...`);
      }
    }
    
    console.log('Migration SQL loaded, executing...');
    
    // Execute the migration using Neon serverless
    try {
      // Split the SQL by semicolons and execute each statement
      const statements = allMigrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('Executing:', statement.substring(0, 100) + '...');
          // Use unsafe raw SQL for migrations
          await sql.unsafe(statement);
        }
      }
      
      console.log('Migration completed successfully');
      
      return NextResponse.json({
        status: 'success',
        message: 'Database migration completed successfully'
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 