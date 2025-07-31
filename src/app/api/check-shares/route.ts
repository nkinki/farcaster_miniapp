import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET() {
  try {
    console.log('Checking shares table structure...');
    
    const client = await pool.connect();
    try {
      // Check shares table structure
      const sharesTableCheck = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'shares' 
        ORDER BY ordinal_position
      `);
      
      // Get recent shares
      const recentShares = await client.query(`
        SELECT * FROM shares 
        ORDER BY shared_at DESC 
        LIMIT 5
      `);
      
      // Count total shares
      const totalShares = await client.query(`
        SELECT COUNT(*) as total FROM shares
      `);
      
      return NextResponse.json({
        status: 'success',
        shares_table_structure: sharesTableCheck.rows,
        recent_shares: recentShares.rows,
        total_shares: totalShares.rows[0].total
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error checking shares:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check shares',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 