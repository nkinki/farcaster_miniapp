import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import pool from '../../../../lib/db';

export async function POST() {
  try {
    console.log('Running database migration...');
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', '002_fix_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL loaded, executing...');
    
    // Execute the migration
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Split the SQL by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('Executing:', statement.substring(0, 100) + '...');
          await client.query(statement);
        }
      }
      
      await client.query('COMMIT');
      console.log('Migration completed successfully');
      
      return NextResponse.json({
        status: 'success',
        message: 'Database migration completed successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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