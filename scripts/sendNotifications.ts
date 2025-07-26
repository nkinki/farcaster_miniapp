// ===== DIAGNOSTIC SCRIPT - DOES NOT SEND NOTIFICATIONS =====
import { Pool } from 'pg';

async function diagnose() {
  console.log("Diagnostic script started. This script will NOT send notifications.");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("Querying for positive changes from the latest stats (WITHOUT JOIN)...");
    
    const result = await pool.query(
      `SELECT 
          miniapp_id, 
          rank_24h_change,
          stat_date 
        FROM miniapp_statistics 
        WHERE 
          rank_24h_change > 0 
          AND stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics)
        ORDER BY rank_24h_change DESC`
    );

    if (result.rows.length > 0) {
      console.log("✅ SUCCESS: Found the following rows with positive changes:");
      console.log(result.rows); // This will print the raw data to the log
    } else {
      console.log("❌ FAILED: Still could not find any rows with positive changes. There might be a data type issue.");
    }

  } catch (error) {
    console.error("❌ An error occurred during the diagnostic query:", error);
  } finally {
    console.log("Closing database connection. Diagnostic finished.");
    await pool.end();
  }
}

diagnose();