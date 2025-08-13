# 🎁 Lucky Box Implementation Guide

## 🎯 Jelenlegi Állapot
- ✅ UI komponens kész és működik
- ✅ Animációk és design elkészült
- ✅ Preview mód implementálva
- ⚠️ **FEJLESZTÉS ALATT** - Valódi jutalmak még nem kerülnek kiosztásra

## 💰 Hogyan Működjön a Valódi Jutalom Rendszer

### 1. 🗄️ Adatbázis Struktúra
```sql
-- Lucky Box rewards tábla
CREATE TABLE lucky_box_rewards (
  id SERIAL PRIMARY KEY,
  user_fid INTEGER NOT NULL,
  campaign_id INTEGER NOT NULL,
  reward_amount INTEGER NOT NULL,
  claimed_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' -- pending, claimed, distributed
);

-- User balances tábla frissítése
ALTER TABLE users ADD COLUMN lucky_box_balance INTEGER DEFAULT 0;
```

### 2. 🔧 Backend API Endpoints

#### POST /api/lucky-box/claim
```javascript
// Kampány létrehozás után automatikusan hívódik
{
  "fid": 12345,
  "campaign_id": 67890,
  "reward_amount": 1500
}
```

#### GET /api/lucky-box/balance/:fid
```javascript
// User Lucky Box egyenlegének lekérdezése
{
  "total_balance": 5000,
  "pending_rewards": 1500,
  "claimed_rewards": 3500
}
```

### 3. 🎮 Frontend Integráció

#### A. Kampány létrehozás után
```typescript
const handleCreateSuccess = async () => {
  setShowForm(false);
  refreshAllData();
  
  // Valódi Lucky Box trigger
  const response = await fetch('/api/lucky-box/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      fid: profile?.fid,
      campaign_id: newCampaignId 
    })
  });
  
  const { reward_amount } = await response.json();
  
  setIsLuckyBoxPreview(false);
  setLuckyBoxReward(reward_amount);
  setShowLuckyBox(true);
};
```

#### B. Jutalom claim
```typescript
const handleLuckyBoxClaim = async (amount: number) => {
  if (!isLuckyBoxPreview) {
    // Valódi jutalom claim
    await fetch('/api/lucky-box/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fid: profile?.fid,
        reward_amount: amount
      })
    });
    
    // UI frissítés
    setUserStats(prev => ({
      ...prev,
      luckyBoxBalance: prev.luckyBoxBalance + amount
    }));
  }
};
```

### 4. 🔗 Smart Contract Integráció

#### A. Treasury Deposit Contract Módosítás
```solidity
// Új funkció a Lucky Box jutalmak kifizetéséhez
function distributeLuckyBoxRewards(
    address[] memory recipients,
    uint256[] memory amounts
) external onlyOwner {
    require(recipients.length == amounts.length, "Arrays length mismatch");
    
    for (uint i = 0; i < recipients.length; i++) {
        CHESS_TOKEN.transfer(recipients[i], amounts[i]);
        emit LuckyBoxRewardDistributed(recipients[i], amounts[i]);
    }
}
```

#### B. Batch Kifizetés Script
```javascript
// Napi/heti batch kifizetés
const distributePendingRewards = async () => {
  const pendingRewards = await db.query(`
    SELECT user_wallet, SUM(reward_amount) as total
    FROM lucky_box_rewards 
    WHERE status = 'pending'
    GROUP BY user_wallet
  `);
  
  // Smart contract hívás
  await treasuryContract.distributeLuckyBoxRewards(
    pendingRewards.map(r => r.user_wallet),
    pendingRewards.map(r => r.total)
  );
  
  // Státusz frissítés
  await db.query(`
    UPDATE lucky_box_rewards 
    SET status = 'distributed' 
    WHERE status = 'pending'
  `);
};
```

### 5. 📊 Admin Dashboard

#### Lucky Box Statisztikák
- Napi/heti kiosztott jutalmak
- User aktivitás tracking
- Jutalom eloszlás analitika
- Pending vs distributed rewards

### 6. 🔐 Biztonsági Megfontolások

#### Rate Limiting
- Max 1 Lucky Box / kampány
- Cooldown period kampányok között
- Anti-spam védelem

#### Fraud Detection
- Suspicious activity monitoring
- Wallet verification
- Campaign quality check

### 7. 🚀 Implementációs Lépések

1. **Backend API** - Lucky Box endpoints
2. **Database** - Reward tracking táblák
3. **Smart Contract** - Batch distribution funkció
4. **Frontend** - Valódi API integráció
5. **Admin Tools** - Monitoring és management
6. **Testing** - Teljes flow tesztelés
7. **Deployment** - Éles környezetbe telepítés

### 8. 💡 Jövőbeli Fejlesztések

- **NFT Rewards** - Ritka NFT-k Lucky Box-ban
- **Multiplier Events** - 2x reward napok
- **Referral Bonuses** - Extra Lucky Box meghívásért
- **Seasonal Themes** - Karácsonyi/Halloween Lucky Box-ok
- **Leaderboards** - Top Lucky Box winners

---

## 🎯 Következő Lépés
1. Backend API endpoints implementálása
2. Database schema létrehozása
3. Smart contract módosítás
4. Frontend API integráció
5. Tesztelés és deployment

**Becsült fejlesztési idő: 2-3 hét**