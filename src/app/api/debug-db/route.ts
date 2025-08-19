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
    
    // Check promotions table structure  
    const promotionsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'promotions' 
      ORDER BY ordinal_position
    `;
    
    // Sample data from shares
    const sampleShares = await sql`
      SELECT * FROM shares LIMIT 3
    `;
    
    // Sample data from promotions
    const samplePromotions = await sql`
      SELECT * FROM promotions LIMIT 3
    `;
    
    // Check like_recast_completions table
    let likeRecastCompletions = null;
    let likeRecastCompletionsColumns = null;
    try {
      likeRecastCompletionsColumns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'like_recast_completions' 
        ORDER BY ordinal_position
      `;
      
      likeRecastCompletions = await sql`
        SELECT * FROM like_recast_completions LIMIT 5
      `;
    } catch (error) {
      console.log('like_recast_completions table does not exist or error:', error);
    }
    
    // Check like_recast_user_actions table
    let likeRecastUserActions = null;
    let likeRecastUserActionsColumns = null;
    try {
      likeRecastUserActionsColumns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'like_recast_user_actions' 
        ORDER BY ordinal_position
      `;
      
      likeRecastUserActions = await sql`
        SELECT * FROM like_recast_user_actions LIMIT 5
      `;
    } catch (error) {
      console.log('like_recast_user_actions table does not exist or error:', error);
    }
    
    return NextResponse.json({
      success: true,
      tables: {
        shares: {
          columns: sharesColumns,
          sampleData: sampleShares
        },
        promotions: {
          columns: promotionsColumns,
          sampleData: samplePromotions
        },
        like_recast_completions: {
          columns: likeRecastCompletionsColumns,
          sampleData: likeRecastCompletions
        },
        like_recast_user_actions: {
          columns: likeRecastUserActionsColumns,
          sampleData: likeRecastUserActions
        }
      }
    });
    
  } catch (error: any) {
    console.error('Debug DB error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error.message 
    }, { status: 500 });
  }
}