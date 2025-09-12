import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting comment columns migration fix...');
    
    // Check if columns already exist
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'promotions' AND column_name IN ('comment_templates', 'custom_comment', 'allow_custom_comments')
    `;
    
    if (columnCheck.length >= 3) {
      return NextResponse.json({ 
        success: true, 
        message: 'Comment columns already exist in promotions table'
      });
    }
    
    console.log('📄 Adding comment columns to promotions table...');
    
    // Add comment columns to promotions table
    await sql`
      ALTER TABLE promotions 
      ADD COLUMN IF NOT EXISTS comment_templates JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS custom_comment TEXT,
      ADD COLUMN IF NOT EXISTS allow_custom_comments BOOLEAN DEFAULT true
    `;
    
    // Add constraints
    await sql`
      ALTER TABLE promotions 
      ADD CONSTRAINT IF NOT EXISTS check_comment_templates_array 
      CHECK (jsonb_typeof(comment_templates) = 'array')
    `;
    
    await sql`
      ALTER TABLE promotions 
      ADD CONSTRAINT IF NOT EXISTS check_custom_comment_length 
      CHECK (custom_comment IS NULL OR length(custom_comment) <= 280)
    `;
    
    // Add indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_promotions_comment_templates ON promotions USING GIN (comment_templates)
    `;
    
    console.log(`✅ Comment columns added to promotions table successfully`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Comment columns added to promotions table successfully'
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
    // Check if columns exist
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'promotions' AND column_name IN ('comment_templates', 'custom_comment', 'allow_custom_comments')
    `;
    
    return NextResponse.json({ 
      success: true, 
      columnsExist: columnCheck.length >= 3,
      existingColumns: columnCheck.map(row => row.column_name)
    });

  } catch (error: any) {
    console.error('❌ Failed to check columns:', error);
    return NextResponse.json({ 
      error: 'Failed to check columns', 
      details: error.message 
    }, { status: 500 });
  }
}
