// Fájl: scripts/sendLottoNotifications.ts

import { Pool } from 'pg';
import fetch from 'node-fetch';

/**
 * A fő funkció, ami lefut, amikor a szkript elindul.
 * Kezeli az adatbázis-kapcsolatot, lekérdezi a szükséges adatokat,
 * összeállítja az értesítést, és elindítja a küldést.
 */
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
    // 1. Felhasználói tokenek lekérdezése az értesítésekhez
    console.log("Querying notification tokens from the database...");
    const { rows: tokenRows } = await pool.query('SELECT token, url FROM notification_tokens');
    if (!tokenRows.length) {
      console.log('No notification tokens found. Stopping.');
      return;
    }
    console.log(`Found ${tokenRows.length} token(s).`);

    let notificationTitle = '';
    let notificationBody = '';

    // 2. Az aktuális, aktív lottó forduló adatainak lekérdezése
    console.log(`Executing Lottery logic for: ${notificationType}`);
    // A kép alapján a helyes táblanév: lottery_draws, oszlopnév: jackpot
    const result = await pool.query(
      `SELECT jackpot FROM lottery_draws WHERE status = 'active' ORDER BY id DESC LIMIT 1`
    );

    if (result.rows.length > 0) {
      const round = result.rows[0];
      const prizePoolRaw = Number(round.jackpot);
      
      // Segédfüggvény a nyeremény formázásához (pl. 1,500,000 -> 1.5M)
      const formattedPrize = (amount: number) => {
          if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
          if (amount >= 1000) return `${Math.floor(amount / 1000)}K`;
          return amount.toString();
      };
      const prizePool = formattedPrize(prizePoolRaw);
      
      // 3. Üzenet összeállítása az értesítés típusa alapján (angolul, UTC idővel)
      if (notificationType === 'LOTTO_MORNING') {
          notificationTitle = `☀️ Good Morning! The Lambo Lottery jackpot is at ${prizePool} CHESS!`;
          notificationBody = `The draw is tonight at 19:00 UTC. Will you be the one to win it all? 🏎️`;
      } else if (notificationType === 'LOTTO_MIDDAY') {
          notificationTitle = `⏰ Midday update! The jackpot has grown to ${prizePool} CHESS!`;
          notificationBody = `Still time to get your lucky numbers for tonight's 19:00 UTC draw. One winner takes all! 💰`;
      } else if (notificationType === 'LOTTO_PRE_DRAW') {
          const now = new Date();
          const drawTime = new Date();
          drawTime.setUTCHours(19, 0, 0, 0); // Sorsolás időpontja: 19:00 UTC
          const hoursLeft = Math.round((drawTime.getTime() - now.getTime()) / (1000 * 60 * 60));

          notificationTitle = `🚨 Final hours! The jackpot is ${prizePool} CHESS!`;
          notificationBody = `Only ${hoursLeft > 0 ? hoursLeft : 1} hour(s) left until the 19:00 UTC draw! Get your tickets now and win the Lambo! 🚀`;
      }
    } else {
        console.log("No active lottery round found. No notification will be sent.");
    }

    // 4. Értesítés elküldése, ha sikeresen összeállt az üzenet
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

/**
 * Segédfüggvény, ami elküldi a push értesítést.
 * Csoportosítja a tokeneket URL szerint, és 100-as adagokban küldi el őket.
 * @param tokenRows - Az adatbázisból lekérdezett tokenek és URL-ek.
 * @param title - Az értesítés címe.
 * @param body - Az értesítés szövege.
 * @param notificationType - Az értesítés típusa az egyedi azonosítóhoz.
 */
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
                targetUrl: 'https://farc-nu.vercel.app', // Ez a link jelenik meg, ha a felhasználó rákattint
                tokens: batch
            };
            
            console.log(`Sending Lotto notification with ID: ${notificationPayload.notificationId} to ${url}`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationPayload)
            });
            console.log(`Dispatch complete. Response:`, await res.text());
        }
    }
}

// A fő funkció futtatása
main();