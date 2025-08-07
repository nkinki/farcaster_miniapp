import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DB_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('Setting up payouts table and claimed_at column...');
    
    // Create payouts table
    await sql`
      CREATE TABLE IF NOT EXISTS payouts (
          id SERIAL PRIMARY KEY,
          user_fid INTEGER NOT NULL,
          amount DECIMAL(18, 2) NOT NULL,
          recipient_address VARCHAR(42) NOT NULL,
          tx_hash VARCHAR(66) NOT NULL,
          shares_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Add claimed_at column to shares table
    try {
      await sql`ALTER TABLE shares ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE`;
    } catch (e) {
      console.log('claimed_at column might already exist, continuing...');
    }
    
    // Add indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_payouts_user_fid ON payouts(user_fid)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_shares_reward_claimed ON shares(reward_claimed)`;
    
    console.log('✅ Setup completed successfully!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payouts table and claimed_at column setup completed' 
    });
    
  } catch (error: any) {
    console.error('❌ Setup failed:', error);
    return NextResponse.json({ 
      error: 'Setup failed', 
      details: error.message 
    }, { status: 500 });
  }
}