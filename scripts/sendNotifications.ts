import { Pool } from 'pg';
import fetch from 'node-fetch';

async function main() {
  const notificationType = process.env.NOTIFICATION_TYPE;
  console.log(`Script started for notification type: ${notificationType}`);

  if (!notificationType) {
    throw new Error('FATAL: NOTIFICATION_TYPE environment variable is not set.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Get user tokens first
    console.log("Querying tokens from the database...");
    const { rows: tokenRows } = await pool.query('SELECT token, url FROM notification_tokens');
    if (!tokenRows.length) {
      console.log('No tokens found. Stopping.');
      return;
    }
    console.log(`Found ${tokenRows.length} token(s).`);

    let notificationTitle = '';
    let notificationBody = '';

    // Decide what to do based on the type
    if (notificationType === 'TOP_1_24H') {
      console.log("Executing TOP_1_24H logic...");
      const result = await pool.query(
        `SELECT m.name, s.rank_24h_change AS change FROM miniapp_statistics s JOIN miniapps m ON s.miniapp_id = m.id WHERE s.rank_24h_change > 0 AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics) ORDER BY s.rank_24h_change DESC LIMIT 1`
      );
      if (result.rows.length > 0) {
        const gainer = result.rows[0];
        notificationTitle = `Today's Top Gainer: ${gainer.name}!`;
        notificationBody = `It jumped (+${gainer.change}) spots on the toplist today. Check it out!`;
      }
    } else if (notificationType === 'TOP_1_72H') {
      console.log("Executing TOP_1_72H logic...");
      const result = await pool.query(
        `SELECT m.name, s.rank_72h_change AS change FROM miniapp_statistics s JOIN miniapps m ON s.miniapp_id = m.id WHERE s.rank_72h_change > 0 AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics) ORDER BY s.rank_72h_change DESC LIMIT 1`
      );
      if (result.rows.length > 0) {
        const rocket = result.rows[0];
        notificationTitle = `72-Hour Rocket: ${rocket.name}!`;
        notificationBody = `It's up (+${rocket.change}) spots in the last 3 days! See the new rankings.`;
      }
    } else if (notificationType === 'TOP_3_24H') {
      console.log("Executing TOP_3_24H logic...");
      const result = await pool.query(
        `SELECT m.name, s.rank_24h_change AS change FROM miniapp_statistics s JOIN miniapps m ON s.miniapp_id = m.id WHERE s.rank_24h_change > 0 AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics) ORDER BY s.rank_24h_change DESC LIMIT 3`
      );
      if (result.rows.length > 0) {
        notificationTitle = "Today's Top 3 Movers!";
        notificationBody = result.rows
          .map((app, index) => `${index + 1}. ${app.name} (+${app.change})`)
          .join(' | ');
      }
    }

    // If a title was set, send the notification
    if (notificationTitle) {
      console.log(`Composed Message -> Title: "${notificationTitle}", Body: "${notificationBody}"`);
      // Pass the notificationType to the helper function
      await sendNotification(tokenRows, notificationTitle, notificationBody, notificationType);
    } else {
      console.log("No relevant data found for this notification type. No notification will be sent.");
    }
    
  } catch (error) {
    console.error("❌ An error occurred during script execution:", error);
  } finally {
    console.log("Closing database connection.");
    await pool.end();
  }
}

// Helper function to send the actual notification
// Now it accepts notificationType to create a proper ID
async function sendNotification(tokenRows: any[], title: string, body: string, notificationType: string) {
    const urlMap: { [url: string]: string[] } = {};
    for (const row of tokenRows) {
        if (!urlMap[row.url]) urlMap[row.url] = [];
        urlMap[row.url].push(row.token);
    }

    for (const [url, tokens] of Object.entries(urlMap)) {
        for (let i = 0; i < tokens.length; i += 100) {
            const batch = tokens.slice(i, i + 100);
            const notificationPayload = {
                // FINAL, LIVE NOTIFICATION ID
                // Combines type and date to make it unique per type, per day
                notificationId: `apprank-report-${notificationType}-${new Date().toISOString().slice(0, 10)}`,
                title,
                body,
                targetUrl: 'https://farc-nu.vercel.app',
                tokens: batch
            };
            
            console.log(`Sending notification with ID: ${notificationPayload.notificationId}`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationPayload)
            });
            console.log(`Dispatch complete. Response:`, await res.text());
        }
    }
}

// Run the main function
main();