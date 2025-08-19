import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing action_type column...');
    
    // Check if action_type column exists
    const columnCheckResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'promotions' 
      AND column_name = 'action_type';
    `);
    
    console.log('🔍 Column check result:', columnCheckResult.rows);
    
    // Get sample promotions with action_type
    const sampleResult = await pool.query(`
      SELECT id, username, action_type, status, created_at
      FROM promotions 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    
    console.log('🔍 Sample promotions:', sampleResult.rows);
    
    return NextResponse.json({ 
      columnExists: columnCheckResult.rows.length > 0,
      columnInfo: columnCheckResult.rows[0] || null,
      samplePromotions: sampleResult.rows
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('🚨 Test API Error:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}