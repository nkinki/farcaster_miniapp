import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Setting up Weather Lotto database...');
    
    // Create migrations_log table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations_log (
        id SERIAL PRIMARY KEY,
        migration_file VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if Weather Lotto migration already exists
    const { rows: existingMigration } = await pool.query(
      'SELECT * FROM migrations_log WHERE migration_file = $1',
      ['012_create_weather_lotto.sql']
    );
    
    if (existingMigration.length > 0) {
      console.log('✅ Weather Lotto database already exists!');
      return NextResponse.json({ 
        success: true, 
        message: 'Weather Lotto database already exists',
        status: 'already_exists'
      });
    }
    
    // Read and execute the Weather Lotto migration
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationPath = path.join(migrationsDir, '012_create_weather_lotto.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Creating Weather Lotto database tables...');
    await pool.query(migrationSQL);
    
    // Log the successful migration
    await pool.query(
      'INSERT INTO migrations_log (migration_file) VALUES ($1)',
      ['012_create_weather_lotto.sql']
    );
    
    // Create initial active round for testing
    console.log('🎯 Creating initial active round...');
    await pool.query(`
      INSERT INTO weather_lotto_rounds (
        round_number, 
        status, 
        house_base, 
        total_pool,
        end_time
      ) VALUES (
        1, 
        'active', 
        200000000000000000000000, 
        200000000000000000000000,
        NOW() + INTERVAL '1 day'
      )
    `);
    
    // Update stats with initial round
    await pool.query(`
      UPDATE weather_lotto_stats 
      SET 
        active_round_id = 1,
        next_draw_time = NOW() + INTERVAL '1 day',
        current_total_pool = 200000000000000000000000
      WHERE id = 1
    `);
    
    console.log('✅ Weather Lotto database setup completed!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Weather Lotto database setup completed successfully',
      status: 'created',
      tables: [
        'weather_lotto_rounds',
        'weather_lotto_tickets', 
        'weather_lotto_claims',
        'weather_lotto_stats'
      ]
    });
    
  } catch (error: any) {
    console.error('❌ Weather Lotto database setup failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
