import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    console.log('🔍 Debug: Checking lottery winnings for FID:', fid);

    // Check if lottery_winnings table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'lottery_winnings'
      );
    `;

    if (!tableExists[0].exists) {
      return NextResponse.json({
        error: 'lottery_winnings table does not exist',
        tableExists: false
      });
    }

    // Get all lottery winnings for the user
    const userWinnings = await sql`
      SELECT * FROM lottery_winnings 
      WHERE player_fid = ${fid || 0}
      ORDER BY created_at DESC
    `;

    // Get all lottery winnings (for debugging)
    const allWinnings = await sql`
      SELECT * FROM lottery_winnings 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    // Get recent lottery draws
    const recentDraws = await sql`
      SELECT * FROM lottery_draws 
      ORDER BY draw_number DESC 
      LIMIT 5
    `;

    // Get recent lottery tickets
    const recentTickets = await sql`
      SELECT * FROM lottery_tickets 
      ORDER BY purchased_at DESC 
      LIMIT 10
    `;

    return NextResponse.json({
      success: true,
      tableExists: true,
      userWinnings: userWinnings,
      allWinnings: allWinnings,
      recentDraws: recentDraws,
      recentTickets: recentTickets,
      debug: {
        userFid: fid,
        userWinningsCount: userWinnings.length,
        allWinningsCount: allWinnings.length,
        recentDrawsCount: recentDraws.length,
        recentTicketsCount: recentTickets.length
      }
    });

  } catch (error: any) {
    console.error('Debug lottery winnings error:', error);
    return NextResponse.json({
      error: 'Failed to debug lottery winnings',
      details: error.message
    }, { status: 500 });
  }
}
