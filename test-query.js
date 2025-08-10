import { Pool } from 'pg';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function test() {
  try {
    console.log('Testing promotion query...');
    
    const result = await pool.query(`
      SELECT username, display_name, total_budget, reward_per_share, cast_url, created_at, status
      FROM promotions 
      WHERE status = 'active' 
      AND created_at > NOW() - INTERVAL '3 hours' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    console.log('Query result:', result.rows);
    console.log('Row count:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('Latest promotion found:', result.rows[0]);
    } else {
      console.log('No promotions found in last 3 hours');
      
      // Check all active promotions
      const allActive = await pool.query(`
        SELECT username, display_name, created_at, status
        FROM promotions 
        WHERE status = 'active' 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      console.log('All active promotions:', allActive.rows);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

test();