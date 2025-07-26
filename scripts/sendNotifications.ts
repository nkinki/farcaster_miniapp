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
    // STEP 1: Query for notification tokens (unchanged)
    console.log("Querying tokens from the database...");
    const { rows: tokenRows } = await pool.query('SELECT token, url FROM notification_tokens');
    
    if (!tokenRows.length) {
      console.log('No tokens found in the database. Script is stopping.');
      return;
    }
    console.log(`Found ${tokenRows.length} token(s).`);

    // STEP 2: Query for all key statistics in parallel
    console.log("Querying for key statistics (24h Gainer, 72h Rocket, 24h Loser)...");
    let gainer24h: { name: string; change: number } | null = null;
    let rocket72h: { name: string; change: number } | null = null;
    let loser24h: { name: string; change: number } | null = null;

    const [gainer24hResult, rocket72hResult, loser24hResult] = await Promise.all([
      // Query for the biggest 24h gainer
      pool.query(
        `SELECT m.name, s.rank_24h_change FROM miniapp_statistics s JOIN miniapps m ON s.miniapp_id = m.id WHERE s.rank_24h_change > 0 AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics) ORDER BY s.rank_24h_change DESC LIMIT 1`
      ),
      // Query for the biggest 72h gainer (the "rocket")
      pool.query(
        `SELECT m.name, s.rank_72h_change FROM miniapp_statistics s JOIN miniapps m ON s.miniapp_id = m.id WHERE s.rank_72h_change > 0 AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics) ORDER BY s.rank_72h_change DESC LIMIT 1`
      ),
      // Query for the biggest 24h loser
      pool.query(
        `SELECT m.name, s.rank_24h_change FROM miniapp_statistics s JOIN miniapps m ON s.miniapp_id = m.id WHERE s.rank_24h_change < 0 AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics) ORDER BY s.rank_24h_change ASC LIMIT 1`
      ),
    ]);

    if (gainer24hResult.rows.length > 0) {
      const row = gainer24hResult.rows[0];
      gainer24h = { name: row.name, change: row.rank_24h_change };
      console.log(`Today's Biggest Gainer: ${gainer24h.name} (+${gainer24h.change})`);
    }
    if (rocket72hResult.rows.length > 0) {
      const row = rocket72hResult.rows[0];
      rocket72h = { name: row.name, change: row.rank_72h_change };
      console.log(`72-Hour Rocket: ${rocket72h.name} (+${rocket72h.change})`);
    }
    if (loser24hResult.rows.length > 0) {
      const row = loser24hResult.rows[0];
      loser24h = { name: row.name, change: row.rank_24h_change };
      console.log(`Today's Biggest Drop: ${loser24h.name} (${loser24h.change})`);
    }

    // STEP 3: Compose a prioritized notification message
    console.log("Composing notification message...");
    let notificationTitle = "Latest AppRank Report!";
    let notificationBody = "Check out the newest toplist and today's changes!";

    // Priority: The 72h rocket is the most exciting news
    if (rocket72h) {
      notificationTitle = `72-Hour Rocket: ${rocket72h.name}!`;
      notificationBody = `It jumped (+${rocket72h.change}) spots in the last 3 days! See the new rankings.`;
    } 
    // If no rocket, check for today's gainer
    else if (gainer24h) {
      notificationTitle = `Today's Biggest Gainer: ${gainer24h.name}!`;
      notificationBody = `It's up (+${gainer24h.change}) spots on the toplist today. Check it out!`;
    }
    // If no gainers at all, mention the biggest drop
    else if (loser24h) {
      notificationTitle = `Big shift in the ranks: ${loser24h.name} drops!`;
      notificationBody = `See what happened on the toplist today, ${loser24h.name} dropped (${loser24h.change}) spots.`;
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
          // MODIFICATION FOR TESTING: Using full ISO string to make it unique every time
          notificationId: `daily-toplist-${new Date().toISOString()}`,
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