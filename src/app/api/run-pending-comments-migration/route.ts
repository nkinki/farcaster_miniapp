import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting pending_comments table creation...');
    
    // Create pending_comments table
    await sql`
      CREATE TABLE IF NOT EXISTS pending_comments (
        id SERIAL PRIMARY KEY,
        promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
        user_fid INTEGER NOT NULL,
        username VARCHAR(255) NOT NULL,
        comment_text TEXT NOT NULL,
        cast_hash VARCHAR(255) NOT NULL,
        reward_amount INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        reviewed_by INTEGER NULL,
        review_notes TEXT NULL
      )
    `;
    
    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_pending_comments_promotion_id ON pending_comments (promotion_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pending_comments_status ON pending_comments (status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pending_comments_created_at ON pending_comments (created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pending_comments_user_fid ON pending_comments (user_fid)`;
    
    console.log('✅ pending_comments table created successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'pending_comments table created successfully'
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error.message 
    }, { status: 500 });
  }
}
