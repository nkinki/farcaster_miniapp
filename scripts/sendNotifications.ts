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

    // Decide what to do based the type
    if (notificationType === 'TOP_1_24H') {
      console.log("Executing TOP_1_24H logic...");
      const result = await pool.query(
        `SELECT m.name, s.rank_24h_change AS change FROM miniapp_statistics s JOIN miniapps m ON s.miniapp_id = m.id WHERE s.rank_24h_change > 0 AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics) ORDER BY s.rank_24h_change DESC LIMIT 1`
      );
      if (result.rows.length > 0) {
        const gainer = result.rows[0];
        notificationTitle = `Today's Top Gainer: ${gainer.name}!`;
        notificationBody = `It jumped (+${gainer.change}) spots on the toplist today. Share it on AppRank and earn $CHESS! 💰`;
      }
    } else if (notificationType === 'TOP_1_72H') {
      console.log("Executing TOP_1_72H logic...");
      const result = await pool.query(
        `SELECT m.name, s.rank_72h_change AS change FROM miniapp_statistics s JOIN miniapps m ON s.miniapp_id = m.id WHERE s.rank_72h_change > 0 AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics) ORDER BY s.rank_72h_change DESC LIMIT 1`
      );
      if (result.rows.length > 0) {
        const rocket = result.rows[0];
        notificationTitle = `72-Hour Rocket: ${rocket.name}!`;
        notificationBody = `It's up (+${rocket.change}) spots in the last 3 days! Share this winner on AppRank & get rewarded! 🎯`;
      }
    } else if (notificationType === 'TOP_3_24H') {
      console.log("Executing TOP_3_24H logic...");
      const result = await pool.query(
        `SELECT m.name, s.rank_24h_change AS change FROM miniapp_statistics s JOIN miniapps m ON s.miniapp_id = m.id WHERE s.rank_24h_change > 0 AND s.stat_date = (SELECT MAX(stat_date) FROM miniapp_statistics) ORDER BY s.rank_24h_change DESC LIMIT 3`
      );
      if (result.rows.length > 0) {
        // Three engaging notification variants for TOP_3_24H
        const notificationVariants = [
          {
            title: `🔥 Top 3 Movers in 24 Hours!`,
            body: `${result.rows.map((app, index) => `${index + 1}. ${app.name} (+${app.change})`).join(' | ')} | Share these winners on AppRank and earn $CHESS! 💸`
          },
          {
            title: `🏆 24-Hour Ranking Stars!`,
            body: `${result.rows.map((app, index) => `${index + 1}. ${app.name} (+${app.change})`).join(' | ')} | Promote these top apps and get paid! Share on AppRank! 🤑`
          },
          {
            title: `🚀 Hottest Apps Today!`,
            body: `${result.rows.map((app, index) => `${index + 1}. ${app.name} (+${app.change})`).join(' | ')} | Turn these trending apps into $CHESS! Share & Earn now! ⚡`
          }
        ];
        // Randomly select one variant
        const selectedVariant = notificationVariants[Math.floor(Math.random() * notificationVariants.length)];
        notificationTitle = selectedVariant.title;
        notificationBody = selectedVariant.body;
      }
    } else if (notificationType === 'NEW_PROMOTION') {
      console.log("Executing NEW_PROMOTION logic...");
      // Check for new promotions that haven't been notified yet
      // First, check if notification_sent column exists, if not add it
      try {
        await pool.query(`ALTER TABLE promotions ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE`);
      } catch (error) {
        console.log('Column notification_sent might already exist or other error:', error);
      }
      
      const result = await pool.query(
        `SELECT id, username, display_name, total_budget, reward_per_share, cast_url, created_at
         FROM promotions 
         WHERE status = 'active' 
         AND (notification_sent IS NULL OR notification_sent = FALSE)
         AND created_at > NOW() - INTERVAL '7 days'
         ORDER BY created_at DESC 
         LIMIT 1`
      );
      
      console.log('Debug - Found promotions:', result.rows.length);
      if (result.rows.length === 0) {
        // Check what active promotions exist
        const allActiveResult = await pool.query(
          `SELECT username, created_at, status FROM promotions WHERE status = 'active' ORDER BY created_at DESC LIMIT 3`
        );
        console.log('Debug - All active promotions:', allActiveResult.rows);
      }
      if (result.rows.length > 0) {
        const promotion = result.rows[0];
        notificationTitle = `🚀 NEW PROMOTION ALERT!`;
        notificationBody = `@${promotion.username} just created a promotion: ${promotion.total_budget.toLocaleString()} CHESS budget, ${promotion.reward_per_share.toLocaleString()} CHESS per share! Share & Earn now! 💰`;
        
        // Store promotion ID for marking as notified after successful send
        (global as any).promotionToMarkNotified = promotion.id;
      }
    }

    // If a title was set, send the notification
    if (notificationTitle) {
      console.log(`Composed Message -> Title: "${notificationTitle}", Body: "${notificationBody}"`);
      // Pass the notificationType to the helper function
      await sendNotification(tokenRows, notificationTitle, notificationBody, notificationType);
      
      // Mark promotion as notified if this was a NEW_PROMOTION notification
      if (notificationType === 'NEW_PROMOTION' && (global as any).promotionToMarkNotified) {
        try {
          await pool.query(
            `UPDATE promotions SET notification_sent = TRUE WHERE id = $1`,
            [(global as any).promotionToMarkNotified]
          );
          console.log(`Marked promotion ${(global as any).promotionToMarkNotified} as notified`);
        } catch (error) {
          console.error('Error marking promotion as notified:', error);
        }
      }
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
                // Combines type, date and timestamp to make it unique per notification
                notificationId: notificationType === 'NEW_PROMOTION' 
                    ? `apprank-promotion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    : `apprank-report-${notificationType}-${new Date().toISOString().slice(0, 10)}`,
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