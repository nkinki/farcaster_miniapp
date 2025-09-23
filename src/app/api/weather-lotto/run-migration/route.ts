import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { migrationName } = await request.json();
    
    if (migrationName !== 'add_transaction_hash') {
      return NextResponse.json(
        { success: false, error: 'Invalid migration name' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    
    try {
      // Add transaction_hash column to weather_lotto_tickets table
      await client.query(`
        ALTER TABLE weather_lotto_tickets 
        ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(66);
      `);

      // Add index for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weather_lotto_tickets_transaction_hash 
        ON weather_lotto_tickets(transaction_hash);
      `);

      // Add comment to document the column
      await client.query(`
        COMMENT ON COLUMN weather_lotto_tickets.transaction_hash IS 'Onchain transaction hash for ticket purchase';
      `);

      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        migration: 'add_transaction_hash'
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error running migration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run migration' },
      { status: 500 }
    );
  }
}
