import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding action_type column to promotions table...');
    
    // Check if column already exists
    const columnCheckResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'promotions' 
      AND column_name = 'action_type';
    `);
    
    if (columnCheckResult.rows.length > 0) {
      return NextResponse.json({ 
        message: 'action_type column already exists',
        success: true
      }, { status: 200 });
    }
    
    // Add the column
    await pool.query(`
      ALTER TABLE promotions 
      ADD COLUMN action_type VARCHAR(20) DEFAULT 'quote';
    `);
    
    console.log('✅ action_type column added successfully');
    
    // Update existing promotions to have 'quote' as default
    const updateResult = await pool.query(`
      UPDATE promotions 
      SET action_type = 'quote' 
      WHERE action_type IS NULL;
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} existing promotions`);
    
    return NextResponse.json({ 
      message: 'action_type column added successfully',
      updatedRows: updateResult.rowCount,
      success: true
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('🚨 Add Column API Error:', error);
    return NextResponse.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
}