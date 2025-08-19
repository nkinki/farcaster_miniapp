import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
  try {
    // Check shares table structure
    const sharesColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'shares' 
      ORDER BY ordinal_position
    `;
    
    // Sample data from shares
    const sampleShares = await sql`
      SELECT * FROM shares LIMIT 5
    `;
    
    return NextResponse.json({
      success: true,
      sharesTable: {
        columns: sharesColumns,
        sampleData: sampleShares
      }
    });
    
  } catch (error: any) {
    console.error('Check shares table error:', error);
    return NextResponse.json({ 
      error: 'Failed to check shares table', 
      details: error.message 
    }, { status: 500 });
  }
}