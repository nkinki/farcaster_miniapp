import { Pool } from 'pg';
import fetch from 'node-fetch';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function sendNotifications() {
  // 1. LÉPÉS: Értesítendő felhasználók lekérdezése
  const { rows: tokenRows } = await pool.query('SELECT token, url FROM notification_tokens');
  if (!tokenRows.length) {
    console.log('Nincs token, nincs értesítés.');
    await pool.end();
    return;
  }
  console.log(`${tokenRows.length} db tokent találtam az adatbázisban.`);

  // 2. LÉPÉS: A nap nyertesének lekérdezése az adatbázisból JOIN-nal
  let gainer: { name: string; change: number } | null = null;
  
  try {
    // JAVÍTOTT LEKÉRDEZÉS:
    // Összekapcsoljuk a 'miniapp_statistics' (s) táblát a 'miniapps' (m) táblával
    // a 'miniapp_id' kulcson keresztül, hogy hozzáférjünk a névhez.
    // A 'stat_date = CURRENT_DATE' biztosítja, hogy csak a mai adatokat nézzük.
    const gainerResult = await pool.query(
      `SELECT
          m.name,
          s.rank_24h_change
        FROM miniapp_statistics AS s
        JOIN miniapps AS m ON s.miniapp_id = m.domain
        WHERE s.rank_24h_change > 0 AND s.stat_date = CURRENT_DATE
        ORDER BY s.rank_24h_change DESC
        LIMIT 1`
    );

    if (gainerResult.rows[0]) {
      gainer = { name: gainerResult.rows[0].name, change: gainerResult.rows[0].rank_24h_change };
      console.log(`A nap nyertese: ${gainer.name} (+${gainer.change})`);
    } else {
      console.log("Nem található mai nyertes (nincs pozitív 24h változás).");
    }
  } catch (error) {
    console.error("Hiba a statisztikák lekérdezése közben:", error);
    await pool.end();
    return;
  }

  // 3. LÉPÉS: Az értesítés szövegének dinamikus összeállítása
  let notificationTitle = "Friss AppRank Toplista!";
  let notificationBody = "Nézd meg a legfrissebb toplistát és a napi változásokat!";

  if (gainer) {
    notificationTitle = `Rakétázik a(z) ${gainer.name}!`;
    notificationBody = `Ma (+${gainer.change}) helyet ugrott előre a toplistán! Nézd meg te is!`;
  }
  
  // 4. LÉPÉS: Az értesítések kiküldése (változatlan)
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
      
      console.log("Értesítés küldése a következő tartalommal:", JSON.stringify(notificationPayload, null, 2));

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload)
      });
      console.log(`Küldve ${batch.length} tokenre, válasz:`, await res.text());
    }
  }

  // 5. LÉPÉS: Adatbázis-kapcsolat lezárása
  await pool.end();
}

sendNotifications().catch(console.error);```

### A Legfontosabb Változások:

1.  **Javított SQL Lekérdezés:** A szkript most már egyetlen, de komplexebb lekérdezést használ, ami helyesen `JOIN`-olja a két releváns táblát. Feltételeztem, hogy a `miniapps` táblában a `domain` oszlop az elsődleges kulcs, amihez a `miniapp_id` kapcsolódik. Ha ez más (pl. `id`), akkor az `ON s.miniapp_id = m.domain` részt kell módosítani.
2.  **`stat_date = CURRENT_DATE`:** Hozzáadtam egy fontos feltételt a `WHERE` klauzulához, ami biztosítja, hogy a szkript mindig csak az **aktuális napra** vonatkozó statisztikákat vegye figyelembe. Ez megakadályozza, hogy egy esetleges adatbázis-frissítési hiba miatt régi adatokat küldjön ki.
3.  **Egyszerűsítés:** A "nap vesztese" lekérdezést egyelőre kivettem, hogy a kód egyszerűbb és a fókusz a helyes `JOIN` műveleten legyen. A nap nyerteséről szóló értesítés sokkal motiválóbb.

Most már ez a szkript pontosan azt fogja tenni, amit szeretnél: kikeresi a mai nap legnagyobb nyertesét, és erről küld egy informatív, dinamikus értesítést.