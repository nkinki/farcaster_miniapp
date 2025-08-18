import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking promotions table...');
    
    // Összes promotion lekérése debug céljából
    const allPromotionsResult = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
    const allPromotions = allPromotionsResult.rows;
    
    console.log(`🔍 Total promotions in DB: ${allPromotions.length}`);
    
    // Aktív promotion-ök
    const activePromotionsResult = await pool.query('SELECT * FROM promotions WHERE status = $1 ORDER BY created_at DESC', ['active']);
    const activePromotions = activePromotionsResult.rows;
    
    console.log(`🔍 Active promotions in DB: ${activePromotions.length}`);
    
    // Promotion-ök státusz szerint csoportosítva
    const statusCountsResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM promotions 
      GROUP BY status;
    `);
    const statusCounts = statusCountsResult.rows;
    
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