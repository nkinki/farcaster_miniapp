import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET() {
  try {
    console.log('Checking database table structure...');
    
    const client = await pool.connect();
    try {
      // Check if users table exists and get its structure
      const usersTableCheck = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      // Check if promotions table exists and get its structure
      const promotionsTableCheck = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'promotions' 
        ORDER BY ordinal_position
      `);
      
      // Check if shares table exists and get its structure
      const sharesTableCheck = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'shares' 
        ORDER BY ordinal_position
      `);
      
      // List all tables
      const allTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      return NextResponse.json({
        status: 'success',
        tables: allTables.rows.map(row => row.table_name),
        users_table_structure: usersTableCheck.rows,
        promotions_table_structure: promotionsTableCheck.rows,
        shares_table_structure: sharesTableCheck.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error checking tables:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check tables',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 