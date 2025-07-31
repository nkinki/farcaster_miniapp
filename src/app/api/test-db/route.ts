import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query test successful!');
    
    client.release();
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Database connection working',
      timestamp: result.rows[0].current_time
    });
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    return NextResponse.json({ 
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined
    }, { status: 500 });
  }
} 