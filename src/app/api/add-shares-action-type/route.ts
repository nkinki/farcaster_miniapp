import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL || process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding action_type column to shares table...');
    
    // Check if column already exists
    const columnCheckResult = await sql`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'shares' 
      AND column_name = 'action_type'
    `;
    
    if (columnCheckResult.length > 0) {
      return NextResponse.json({ 
        message: 'action_type column already exists in shares table',
        success: true
      }, { status: 200 });
    }
    
    // Add the column
    await sql`
      ALTER TABLE shares 
      ADD COLUMN action_type VARCHAR(20) DEFAULT 'quote'
    `;
    
    console.log('✅ action_type column added to shares table successfully');
    
    // Update existing shares to have 'quote' as default
    const updateResult = await sql`
      UPDATE shares 
      SET action_type = 'quote' 
      WHERE action_type IS NULL
    `;
    
    console.log(`✅ Updated existing shares with default action_type`);
    
    return NextResponse.json({ 
      message: 'action_type column added to shares table successfully',
      success: true
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('🚨 Add Shares Action Type Column API Error:', error);
    return NextResponse.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
}