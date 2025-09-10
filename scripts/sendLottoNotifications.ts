import { Pool } from 'pg';
import fetch from 'node-fetch';

// Fő funkció
async function main() {
  const notificationType = process.env.NOTIFICATION_TYPE;
  console.log(`Lotto script started for notification type: ${notificationType}`);

  if (!notificationType) {
    throw new Error('FATAL: NOTIFICATION_TYPE environment variable is not set for Lotto script.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Felhasználói tokenek lekérdezése
    console.log("Querying notification tokens from the database...");
    const { rows: tokenRows } = await pool.query('SELECT token, url FROM notification_tokens');
    if (!tokenRows.length) {
      console.log('No notification tokens found. Stopping.');
      return;
    }
    console.log(`Found ${tokenRows.length} token(s).`);

    let notificationTitle = '';
    let notificationBody = '';

    // 2. Lottó adatainak lekérdezése és üzenet összeállítása
    console.log(`Executing Lottery logic for: ${notificationType}`);
    const result = await pool.query(
      `SELECT prize_pool FROM lottery_rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1`
    );

    if (result.rows.length > 0) {
      const round = result.rows[0];
      const prizePoolRaw = Number(round.prize_pool);
      
      // A nyeremény formázása (pl. 1,500,000 -> 1.5M)
      const formattedPrize = (amount: number) => {
          if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
          if (amount >= 1000) return `${Math.floor(amount / 1000)}K`;
          return amount.toString();
      };
      const prizePool = formattedPrize(prizePoolRaw);
      
      // Üzenet kiválasztása a típus alapján
      if (notificationType === 'LOTTO_MORNING') {
          notificationTitle = `☀️ Good Morning! The Lambo Lottery jackpot is at ${prizePool} CHESS!`;
          notificationBody = `The draw is tonight at 21:00 (Budapest). Will you be the one to win it all? 🏎️`;
      } else if (notificationType === 'LOTTO_MIDDAY') {
          notificationTitle = ` lunchtime! The jackpot has grown to ${prizePool} CHESS!`;
          notificationBody = `Still time to get your lucky numbers for tonight's draw. One winner takes all! 💰`;
      } else if (notificationType === 'LOTTO_PRE_DRAW') {
          // Kiszámoljuk a hátralévő időt a 19:00 UTC sorsolásig
          const now = new Date();
          const drawTime = new Date();
          drawTime.setUTCHours(19, 0, 0, 0);
          const hoursLeft = Math.round((drawTime.getTime() - now.getTime()) / (1000 * 60 * 60));

          notificationTitle = `🚨 Final hours! The jackpot is ${prizePool} CHESS!`;
          notificationBody = `Only ${hoursLeft > 0 ? hoursLeft : 1} hour(s) left! Get your tickets now and win the Lambo! 🚀`;
      }
    } else {
        console.log("No active lottery round found. No notification will be sent.");
    }

    // 3. Értesítés küldése, ha van üzenet
    if (notificationTitle) {
      console.log(`Composed Message -> Title: "${notificationTitle}", Body: "${notificationBody}"`);
      await sendNotification(tokenRows, notificationTitle, notificationBody, notificationType);
    } else {
      console.log("No notification title was generated. Skipping send.");
    }
    
  } catch (error) {
    console.error("❌ An error occurred during Lotto script execution:", error);
  } finally {
    console.log("Closing database connection.");
    await pool.end();
  }
}

// Segédfüggvény az értesítés küldéséhez (változatlanul átvéve)
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
                notificationId: `apprank-lotto-report-${notificationType}-${new Date().toISOString().slice(0, 10)}`,
                title,
                body,
                targetUrl: 'https://farc-nu.vercel.app', // Ezt a linket módosítsd, ha a lottóra kell mutatnia
                tokens: batch
            };
            
            console.log(`Sending Lotto notification with ID: ${notificationPayload.notificationId}`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationPayload)
            });
            console.log(`Dispatch complete. Response:`, await res.text());
        }
    }
}

// Fő funkció futtatása
main();