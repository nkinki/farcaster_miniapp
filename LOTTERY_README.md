# 🏎️ BUY A LAMBO Lottery System

A teljes BUY A LAMBO lottó rendszer implementálva van a Farcaster miniappban!

## 🎯 Főbb funkciók

- **1 millió CHESS token** alapnyeremény
- **1-100 sorsjegy** vásárlása, 20,000 CHESS áron
- **Több sorsjegy** is vásárolható egyszerre (max 10)
- **Napi húzás** este 8-kor UTC
- **70%** a következő napra, **30%** a kincstárba
- **Egy nyertes visz mindent** (All In!)

## 🗄️ Adatbázis struktúra

### Táblák

1. **`lottery_draws`** - Lottó körök
   - `id` - Egyedi azonosító
   - `draw_number` - Kör száma
   - `start_time` - Kezdés dátuma
   - `end_time` - Befejezés dátuma
   - `jackpot` - Nyereményalap (CHESS tokenekben)
   - `status` - Állapot (pending/active/completed)
   - `winning_number` - Nyertes szám
   - `total_tickets` - Eladott jegyek száma

2. **`lottery_tickets`** - Lottó jegyek
   - `id` - Egyedi azonosító
   - `draw_id` - Kör azonosítója
   - `player_fid` - Felhasználó FID-je
   - `player_address` - Felhasználó címe
   - `player_name` - Felhasználó neve
   - `player_avatar` - Felhasználó avatárja
   - `number` - Jegy száma (1-100)
   - `created_at` - Vásárlás dátuma

3. **`lottery_stats`** - Lottó statisztikák
   - `id` - Egyedi azonosító
   - `total_tickets` - Összes eladott jegy
   - `active_tickets` - Aktív jegyek
   - `total_jackpot` - Összes nyereményalap
   - `next_draw_time` - Következő húzás ideje
   - `last_draw_number` - Utolsó kör száma

## 🚀 API végpontok

### Alapvető műveletek

1. **`GET /api/lottery/current-round`** - Aktuális kör lekérése
2. **`POST /api/lottery/purchase-tickets`** - Jegyek vásárlása
3. **`GET /api/lottery/user-tickets`** - Felhasználó jegyei
4. **`GET /api/lottery/stats`** - Lottó statisztikák

### Admin műveletek

5. **`POST /api/lottery/draw-winner`** - Nyeremény sorsolás
6. **`POST /api/lottery/create-new-round`** - Új kör létrehozása
7. **`POST /api/lottery/complete-cycle`** - Teljes ciklus végrehajtása
8. **`POST /api/lottery/test-simulation`** - Tesztelési szimuláció

## 🧪 Tesztelés és szimuláció

### Tesztelési API használata

```bash
# Adatok törlése és újraindítás
curl -X POST http://localhost:3000/api/lottery/test-simulation \
  -H "Content-Type: application/json" \
  -d '{"action": "reset"}'

# Jegyek vásárlásának szimulálása
curl -X POST http://localhost:3000/api/lottery/test-simulation \
  -H "Content-Type: application/json" \
  -d '{"action": "simulate_purchase", "testFid": 12345}'

# Nyeremény sorsolás szimulálása
curl -X POST http://localhost:3000/api/lottery/test-simulation \
  -H "Content-Type: application/json" \
  -d '{"action": "simulate_draw"}'

# Új kör létrehozásának szimulálása
curl -X POST http://localhost:3000/api/lottery/test-simulation \
  -H "Content-Type: application/json" \
  -d '{"action": "simulate_new_round"}'
```

### Admin felület

Látogass el a `/lottery-admin` oldalra a böngészőben a lottó teszteléséhez!

## 🔄 Lottó ciklus

### 1. Kör kezdése
- Új kör létrehozása 1M CHESS alapnyereménnyel
- 24 órás jegyvásárlási időszak
- Húzás 1 órával a jegyvásárlás után

### 2. Jegyek vásárlása
- Felhasználók 1-10 jegyet vásárolhatnak
- Minden jegy 20,000 CHESS
- Maximum 100 jegy egy körben

### 3. Nyeremény sorsolás
- Véletlenszerű szám generálása (1-100)
- Nyertes kiválasztása (ha van egyező jegy)
- Kör befejezése

### 4. Új kör létrehozása
- 70% a jegyeladásból a következő körre
- 30% a kincstárba
- Alapnyeremény: 1M + carryover

## 💰 Gazdasági modell

- **Jegyár**: 20,000 CHESS
- **Alapnyeremény**: 1,000,000 CHESS
- **Carryover**: 70% az előző körből
- **Kincstár**: 30% minden jegyvásárlásból
- **Nyeremény**: Egy nyertes visz mindent

## 🛠️ Fejlesztői információk

### Környezeti változók

```env
DATABASE_URL=your_neon_database_url
```

### Adatbázis migráció

```sql
-- Futtasd a migrations/011_create_lambo_lottery.sql fájlt
```

### Build és futtatás

```bash
npm run build
npm run dev
```

## 📱 Felhasználói felület

- **Főoldal**: BUY A LAMBO gomb az "Under Development" címkével
- **Lottó modal**: Jegyek vásárlása, számok kiválasztása
- **Admin panel**: `/lottery-admin` teszteléshez

## 🔮 Jövőbeli fejlesztések

- [ ] Smart contract integráció
- [ ] Farcaster cast értesítések
- [ ] Automatikus napi húzás cron job
- [ ] Több játékos támogatás
- [ ] Mobil alkalmazás

## 🎉 Használat

1. **Fejlesztői módban**: Használd a tesztelési API-t
2. **Éles környezetben**: Automatikus napi húzás
3. **Admin felületen**: Kövesd a lottó állapotát

A BUY A LAMBO lottó rendszer most teljesen működőképes és tesztelhető! 🚀✨
