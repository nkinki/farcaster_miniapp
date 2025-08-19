import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
  try {
    // List all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    // Check if users table exists and has data
    let usersData = null;
    try {
      usersData = await sql`SELECT * FROM users LIMIT 5`;
    } catch (error) {
      console.log('Users table does not exist or is empty');
    }
    
    return NextResponse.json({
      success: true,
      tables: tables.map(t => t.table_name),
      usersData: usersData
    });
    
  } catch (error: any) {
    console.error('Check tables error:', error);
    return NextResponse.json({ 
      error: 'Failed to check tables', 
      details: error.message 
    }, { status: 500 });
  }
}