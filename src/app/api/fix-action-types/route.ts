import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Fixing action types constraint...');
    
    // Drop the existing constraint
    await sql`
      ALTER TABLE like_recast_actions 
      DROP CONSTRAINT IF EXISTS like_recast_actions_action_type_check
    `;
    
    // Add the new constraint that includes 'comment'
    await sql`
      ALTER TABLE like_recast_actions 
      ADD CONSTRAINT like_recast_actions_action_type_check 
      CHECK (action_type IN ('like', 'recast', 'comment'))
    `;
    
    console.log(`✅ Action types constraint updated successfully`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Action types constraint updated to include comment'
    });

  } catch (error: any) {
    console.error('❌ Constraint update failed:', error);
    return NextResponse.json({ 
      error: 'Constraint update failed', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check current constraint
    const constraints = await sql`
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conname = 'like_recast_actions_action_type_check'
    `;
    
    return NextResponse.json({ 
      success: true, 
      constraints: constraints,
      hasConstraint: constraints.length > 0
    });

  } catch (error: any) {
    console.error('❌ Failed to check constraints:', error);
    return NextResponse.json({ 
      error: 'Failed to check constraints', 
      details: error.message 
    }, { status: 500 });
  }
}
