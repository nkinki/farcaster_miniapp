import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking promotions table...');
    
    // Összes promotion lekérése debug céljából
    const allPromotions = await sql`SELECT * FROM promotions ORDER BY created_at DESC;`;
    
    console.log(`🔍 Total promotions in DB: ${allPromotions.length}`);
    
    // Aktív promotion-ök
    const activePromotions = await sql`SELECT * FROM promotions WHERE status = 'active' ORDER BY created_at DESC;`;
    
    console.log(`🔍 Active promotions in DB: ${activePromotions.length}`);
    
    // Promotion-ök státusz szerint csoportosítva
    const statusCounts = await sql`
      SELECT status, COUNT(*) as count 
      FROM promotions 
      GROUP BY status;
    `;
    
    console.log(`🔍 Promotions by status:`, statusCounts);
    
    return NextResponse.json({ 
      total: allPromotions.length,
      active: activePromotions.length,
      statusCounts,
      allPromotions: allPromotions.slice(0, 10), // Első 10 promotion
      activePromotions: activePromotions.slice(0, 10) // Első 10 aktív promotion
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('🚨 Debug API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}