import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing promotions action_type...');
    
    // 1. Check if action_type column exists in promotions table
    const columnCheckResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'promotions' 
      AND column_name = 'action_type';
    `);
    
    console.log('🔍 Promotions action_type column:', columnCheckResult.rows);
    
    // 2. If column doesn't exist, add it
    if (columnCheckResult.rows.length === 0) {
      await pool.query(`
        ALTER TABLE promotions 
        ADD COLUMN action_type VARCHAR(20) DEFAULT 'quote';
      `);
      console.log('✅ Added action_type column to promotions table');
    }
    
    // 3. Update existing promotions to have proper action_type values
    // Set some promotions to 'like_recast' for testing
    const updateResult = await pool.query(`
      UPDATE promotions 
      SET action_type = CASE 
        WHEN id % 3 = 0 THEN 'like_recast'  -- Every 3rd promotion
        ELSE 'quote'
      END
      WHERE action_type IS NULL OR action_type = '';
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} promotions with action_type`);
    
    // 4. Get sample of updated promotions
    const sampleResult = await pool.query(`
      SELECT id, username, action_type, status, created_at
      FROM promotions 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);
    
    console.log('📊 Sample promotions after update:', sampleResult.rows);
    
    // 5. Count promotions by action_type
    const countResult = await pool.query(`
      SELECT action_type, COUNT(*) as count
      FROM promotions 
      GROUP BY action_type;
    `);
    
    console.log('📈 Promotions count by action_type:', countResult.rows);
    
    return NextResponse.json({ 
      success: true,
      message: 'Promotions action_type fixed successfully',
      columnExists: columnCheckResult.rows.length > 0,
      updatedRows: updateResult.rowCount,
      samplePromotions: sampleResult.rows,
      actionTypeCounts: countResult.rows
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('🚨 Fix Promotions API Error:', error);
    return NextResponse.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
}