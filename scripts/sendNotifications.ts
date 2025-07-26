import { Pool } from 'pg';
import fetch from 'node-fetch';

async function sendNotifications() {
  console.log("Script started. Creating database connection...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // STEP 1: Query for notification tokens
    console.log("Querying tokens from the database...");
    const { rows: tokenRows } = await pool.query('SELECT token, url FROM notification_tokens');
    
    if (!tokenRows.length) {
      console.log('No tokens found in the database. Script is stopping.');
      return;
    }
    console.log(`Found ${tokenRows.length} token(s).`);

    // STEP 2: Query for the winner of the latest day
    console.log("Querying for the latest day's winner...");
    let gainer: { name: string; change: number } | null = null;
    
    const gainerResult = await pool.query(
      `SELECT
          m.name,
          s.rank_24h_change
        FROM miniapp_statistics AS s
        JOIN miniapps AS m ON s.miniapp_id = m.domain
        WHERE 
          s.rank_24h_change > 0 
          AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics)
        ORDER BY s.rank_24h_change DESC
        LIMIT 1`
    );

    if (gainerResult.rows.length > 0) {
      const winnerRow = gainerResult.rows[0];
      gainer = { name: winnerRow.name, change: winnerRow.rank_24h_change };
      console.log(`Latest winner: ${gainer.name} (+${gainer.change})`);
    } else {
      console.log("No winner found in the latest statistics.");
    }

    // STEP 3: Compose the notification message dynamically
    console.log("Composing notification message...");
    // Default English messages
    let notificationTitle = "Latest AppRank Report!";
    let notificationBody = "Check out the newest toplist and today's changes!";

    // If a winner was found, create a more exciting message
    if (gainer) {
      notificationTitle = `${gainer.name} is skyrocketing!`;
      notificationBody = `It jumped (+${gainer.change}) spots on the toplist today! Check it out!`;
    }
    
    // STEP 4: Prepare and send the notifications
    console.log("Preparing notifications for dispatch...");
    const urlMap: { [url: string]: string[] } = {};
    for (const row of tokenRows) {
      if (!urlMap[row.url]) urlMap[row.url] = [];
      urlMap[row.url].push(row.token);
    }

    for (const [url, tokens] of Object.entries(urlMap)) {
      for (let i = 0; i < tokens.length; i += 100) {
        const batch = tokens.slice(i, i + 100);
        
        const notificationPayload = {
          notificationId: `daily-toplist-${new Date().toISOString().slice(0, 10)}`,
          title: notificationTitle,
          body: notificationBody,
          targetUrl: 'https://farc-nu.vercel.app',
          tokens: batch
        };
        
        console.log(`Sending notification to ${batch.length} token(s)...`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationPayload)
        });
        console.log(`Dispatch complete. Response:`, await res.text());
      }
    }
  } catch (error) {
    console.error("❌ An error occurred during script execution:", error);
  } finally {
    // STEP 5: Close the database connection
    console.log("Closing database connection.");
    await pool.end();
  }
}

// Run the script
sendNotifications();