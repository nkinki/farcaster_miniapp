# 🎰 $CHESS Lottó Rendszer

## 📋 Áttekintés

A $CHESS Lottó egy egyszerű, izgalmas játék, ahol a játékosok egy számot választanak 1-100 között, és ha kitalálják a nyerő számot, **minden** a jackpotból az övék!

## 🎯 Játék Mechanika

### **Szabályok**
- **Egy szám**: 1-100 között választhatsz
- **Sorsjegy ára**: 20,000 $CHESS
- **Limit**: 1-100 db sorsjegy / felhasználó / húzás
- **Nyeremény**: Ha kitalálod a számot, **100% a jackpotból**

### **Sorsolás**
- **Időpont**: Minden este 20:00 UTC
- **Véletlenszám**: 1-100 között
- **Nyertes**: Aki kitalálta a számot
- **Jackpot növekedés**: Ha nincs nyertes, a tét 70%-kal nő

## 🏗️ Technikai Implementáció

### **Fájl Struktúra**
```
src/
├── types/lottery.ts              # Típus definíciók
├── app/api/lottery/
│   ├── stats/route.ts            # Statisztikák API
│   ├── buy-ticket/route.ts       # Sorsjegy vásárlás API
│   └── draw/route.ts             # Sorsolás API
├── components/lottery/
│   ├── LotteryButton.tsx         # Kis lottó gomb (footer)
│   └── LotteryArena.tsx          # Teljes lottó aréna
└── app/lottery/page.tsx          # Lottó oldal
```

### **API Endpointok**

#### **1. Statisztikák Lekérése**
```http
GET /api/lottery/stats
```
**Válasz:**
```json
{
  "success": true,
  "stats": {
    "totalTickets": 0,
    "activeTickets": 0,
    "totalJackpot": 1000000,
    "nextDrawTime": "2024-01-01T20:00:00Z",
    "lastDrawNumber": 0
  }
}
```

#### **2. Sorsjegy Vásárlás**
```http
POST /api/lottery/buy-ticket
```
**Body:**
```json
{
  "playerFid": 12345,
  "playerAddress": "0x...",
  "playerName": "Player Name",
  "playerAvatar": "https://...",
  "number": 42,
  "ticketCount": 3
}
```

#### **3. Sorsolás Végrehajtása**
```http
POST /api/lottery/draw
```
**Body:**
```json
{
  "action": "perform_draw"
}
```

## 🎨 Frontend Komponensek

### **LotteryButton**
- **Helye**: Jobb alsó sarok, a footer felett
- **Stílus**: Arany szín, hover effektekkel
- **Funkció**: Navigál a `/lottery` oldalra

### **LotteryArena**
- **Teljes lottó felület**
- **Szám kiválasztás**: 1-100 között
- **Sorsjegy mennyiség**: 1-100 db
- **Ár kalkuláció**: Automatikus
- **Felhasználó sorsjegyek**: Megjelenítés
- **Aktív sorsjegyek**: Rendszerben

### **LotteryPage**
- **Információs oldal**
- **Jackpot megjelenítés**
- **Statisztikák**
- **Hogyan játszol útmutató**
- **Aktív sorsjegyek listája**

## 💾 Adatkezelés

### **Jelenlegi Implementáció**
- **In-memory storage**: Egyszerű teszteléshez
- **Automatikus törlés**: Nincs implementálva
- **Adatbázis**: Később hozzáadandó

### **Jövőbeli Fejlesztések**
- **PostgreSQL/MySQL**: Perzisztens tárolás
- **Redis**: Cache és session kezelés
- **Blockchain**: Véletlenszám generálás
- **Cron jobs**: Automatikus sorsolás

## 🚀 Használat

### **1. Sorsjegy Vásárlás**
1. Navigálj a lottó oldalra (`/lottery`)
2. Válaszd ki a számot (1-100)
3. Állítsd be a sorsjegy mennyiségét
4. Kattints a "🎰 Sorsjegy Vásárlása" gombra

### **2. Sorsolás Követése**
- **Időpont**: Minden este 20:00 UTC
- **Eredmény**: Automatikus megjelenítés
- **Nyeremény**: Automatikus kifizetés

### **3. Admin Funkciók**
- **Manuális sorsolás**: `/api/lottery/draw` endpoint
- **Statisztikák**: `/api/lottery/stats` endpoint
- **Sorsjegyek**: `/api/lottery/buy-ticket` endpoint

## 🔧 Fejlesztői Jegyzetek

### **Típusok**
```typescript
interface LotteryTicket {
  id: number
  playerFid: number
  playerAddress: string
  playerName: string
  playerAvatar?: string
  number: number // 1-100
  drawId: number
  isActive: boolean
  createdAt: Date
}

interface LotteryStats {
  totalTickets: number
  activeTickets: number
  totalJackpot: number
  nextDrawTime: Date
  lastDrawNumber: number
}
```

### **Konstansok**
- **Sorsjegy ára**: 20,000 $CHESS
- **Alap jackpot**: 1,000,000 $CHESS
- **Szám tartomány**: 1-100
- **Sorsjegy limit**: 1-100 db / felhasználó

## 📱 Reszponzív Design

- **Mobile-first** megközelítés
- **Tailwind CSS** használata
- **Hover effektek** desktop-on
- **Touch-friendly** mobile-on

## 🎯 Következő Lépések

1. **Smart Contract fejlesztés**
2. **Blockchain integráció**
3. **Automatikus sorsolás**
4. **Nyeremény kifizetés**
5. **Admin felület**
6. **Analytics és statisztikák**

## 🐛 Ismert Problémák

- **In-memory storage**: Adatok elvesznek újraindításkor
- **Nincs validáció**: Wallet kapcsolat ellenőrzése hiányzik
- **Nincs authentication**: Felhasználó azonosítás hiányzik

## 📞 Kapcsolat

Ha kérdésed van a lottó rendszerrel kapcsolatban, kérlek jelezd a fejlesztői csapatnak!

---

**🎰 Jó szerencsét a játékban!** 🍀
