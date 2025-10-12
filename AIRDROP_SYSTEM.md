# 🎯 Airdrop Distribution System

## Áttekintés

Az airdrop rendszer arányosan osztja el a season rewardokat a felhasználók között, a pontjaik alapján.

## Hogyan működik?

### 1. Pontgyűjtés
A felhasználók pontokat gyűjtenek különböző aktivitásokért:
- **Daily Check:** 1 pont/nap
- **Like/Recast:** 1 pont/akció
- **Quote/Share:** 1 pont/akció
- **Comment:** 1 pont/akció
- **Lambo Lottery:** 1 pont/jegy
- **Weather Lotto:** 1 pont/jegy
- **CHESS Holdings:** 1M CHESS = 1 pont

### 2. Arányos elosztás
```javascript
// Minden felhasználó reward-ja:
userReward = (userPoints / totalPoints) * totalRewardAmount

// Példa:
// - Összes pont: 100,000
// - User pontjai: 1,000
// - Összes reward: 1,000,000 CHESS
// - User reward-ja: (1,000 / 100,000) * 1,000,000 = 10,000 CHESS
```

## API Endpoints

### 1. Distribution kiszámítása
```bash
POST /api/season/calculate-airdrop
{
  "seasonId": 1,
  "totalRewardAmount": 1000000000000000000000000  // 1M CHESS in wei
}
```

**Válasz:**
```json
{
  "success": true,
  "season_id": 1,
  "total_reward_amount": 1000000000000000000000000,
  "total_users": 150,
  "total_points": 50000,
  "distributed_amount": 999999999999999999999000,
  "remaining_amount": 1000,
  "distribution": [
    {
      "rank": 1,
      "user_fid": 12345,
      "points": 1000,
      "percentage": 2.0000,
      "reward_amount": 20000000000000000000000,
      "reward_amount_formatted": "20000.00 CHESS"
    }
  ]
}
```

### 2. Airdrop kiosztása
```bash
POST /api/season/distribute-airdrop
{
  "seasonId": 1,
  "dryRun": false  // true = csak szimuláció
}
```

**Válasz:**
```json
{
  "success": true,
  "season_id": 1,
  "season_name": "Season 0",
  "dry_run": false,
  "total_users": 150,
  "successful_distributions": 148,
  "failed_distributions": 2,
  "results": [
    {
      "user_fid": 12345,
      "recipient_address": "0x...",
      "reward_amount": 20000000000000000000000,
      "reward_amount_formatted": "20000.00 CHESS",
      "status": "success",
      "transaction_hash": "0x..."
    }
  ]
}
```

## Admin Felület

### Elérés
```
https://farc-nu.vercel.app/admin/airdrop
```

### Funkciók
1. **Season kiválasztása** - Aktív és befejezett season-ök
2. **Distribution kiszámítása** - Arányos elosztás előnézete
3. **Dry Run** - Tesztelés valós tranzakciók nélkül
4. **Tényleges kiosztás** - CHESS tokenek küldése

### Használat
1. Válassz egy season-t
2. Kattints "Calculate Distribution" gombra
3. Nézd meg az előnézetet
4. Tesztelj "Dry Run Test" gombbal
5. Kiosztás "Distribute Airdrop" gombbal

## Adatbázis táblák

### `airdrop_claims`
```sql
CREATE TABLE airdrop_claims (
  id SERIAL PRIMARY KEY,
  user_fid BIGINT NOT NULL,
  season_id INTEGER REFERENCES seasons(id),
  points_used INTEGER NOT NULL,
  reward_amount BIGINT NOT NULL,  -- CHESS wei
  status VARCHAR(20) DEFAULT 'pending',  -- pending, claimed, expired
  transaction_hash VARCHAR(66),
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Biztonsági megfontolások

### 1. Treasury Wallet
- Privát kulcs biztonságos tárolása
- Csak airdrop kiosztáshoz használható
- Külön wallet airdrop-hoz

### 2. Validáció
- User wallet cím ellenőrzése
- Pontok validálása
- Tranzakció státusz ellenőrzése

### 3. Hiba kezelés
- Sikertelen tranzakciók naplózása
- Retry mechanizmus
- Manual intervention lehetősége

## Példa használat

### 1. Season létrehozása
```bash
POST /api/season/create-season-0
```

### 2. Felhasználók pontgyűjtése
- Daily check-ek
- Promotion akciók
- Lottery jegyek

### 3. Season vége
```bash
# 1. Distribution kiszámítása
POST /api/season/calculate-airdrop
{
  "seasonId": 1,
  "totalRewardAmount": 1000000000000000000000000
}

# 2. Dry run tesztelés
POST /api/season/distribute-airdrop
{
  "seasonId": 1,
  "dryRun": true
}

# 3. Tényleges kiosztás
POST /api/season/distribute-airdrop
{
  "seasonId": 1,
  "dryRun": false
}
```

## Monitoring

### Logok
- Distribution számítások
- Tranzakció státuszok
- Hibaüzenetek

### Metrikák
- Sikeres kiosztások száma
- Sikertelen kiosztások száma
- Összes kiosztott CHESS mennyiség

## Jövőbeli fejlesztések

### 1. Batch processing
- Nagy mennyiségű user kezelése
- Chunk-okban történő feldolgozás

### 2. Retry mechanizmus
- Sikertelen tranzakciók újrapróbálása
- Exponential backoff

### 3. Notification system
- Email értesítések
- Farcaster posztok

### 4. Analytics
- Distribution statisztikák
- User engagement metrikák
