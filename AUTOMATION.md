# 🤖 Automatikus Frissítési Rendszer

Ez a dokumentum leírja a Farcaster Miniapp projekt automatikus frissítési rendszerét.

## 📋 Áttekintés

A rendszer naponta 2x automatikusan frissíti a miniapp rangsorokat:
- **Reggel**: 2:00 AM UTC
- **Délután**: 2:00 PM UTC

## 🔄 Frissítési Folyamat

### 1. Adatok Letöltése
- Farcaster API hívás
- Lapozás kezelése (cursor)
- JSON fájl mentése

### 2. Adatbázis Frissítése
- Neon PostgreSQL kapcsolat
- Miniapp metaadatok upsert
- Rangsorok beszúrása
- 24h, 72h, heti változások számítása
- Snapshot mentése

### 3. Frontend Frissítése
- JSON fájl másolása
- Git commit és push
- Vercel automatikus deployment

## 📊 Adatbázis Táblák

### Alapvető táblák:
- `miniapps` - Miniapp metaadatok
- `miniapp_rankings` - Napi rangsorok (72h változások)
- `ranking_snapshots` - Teljes napi snapshotok

### Kiterjesztett táblák:
- `miniapp_rankings_24h` - 24 órás változások
- `miniapp_rankings_weekly` - Heti változások
- `miniapp_statistics` - Összesített statisztikák
- `daily_summary` - Napi összefoglaló

## 🛠️ Technikai Részletek

### GitHub Actions Workflow
```yaml
name: Farcaster Miniapp Update Cron
on:
  schedule:
    - cron: '0 2,14 * * *'  # 2:00 AM és 2:00 PM UTC
  workflow_dispatch:  # Manuális indítás
```

### Python Scriptek
- `update_ranking_simple.py` - Adatok letöltése
- `daily_update.py` - Adatbázis frissítés
- `config.py` - Konfiguráció
- `requirements.txt` - Függőségek

### Környezeti Változók
```bash
NEON_DB_URL=postgresql://...
FARCASTER_BEARER_TOKEN=...
```

## 📈 Statisztikák

### Frontend Megjelenítés
- **Top 10** miniapp
- **Emelkedők/Esők** (72h)
- **Kategória eloszlás**
- **Részletes változások**

### Adatbázis Lekérdezések
- Napi top 10
- Legnagyobb emelkedők (24h, 72h, 7d)
- Legnagyobb esők (24h, 72h, 7d)
- Összesített statisztikák

## 🔧 Hibaelhárítás

### Gyakori problémák:
1. **Bearer token lejárt** - Új token generálása
2. **API hiba** - Farcaster API állapot ellenőrzése
3. **Adatbázis kapcsolat** - Neon DB állapot
4. **Git push hiba** - GitHub token ellenőrzése

### Tesztelés:
```bash
python test_automation.py
```

## 📅 Ütemezés

### Napi Frissítések
- **02:00 UTC** - Reggeli frissítés
- **14:00 UTC** - Délutáni frissítés

### Heti Karbantartás
- **Vasárnap** - Adatbázis tisztítás
- **Hónap végén** - Archíválás

## 🎯 Célok

- ✅ **Automatikus frissítés** - Naponta 2x
- ✅ **Adatbázis tárolás** - Neon PostgreSQL
- ✅ **Frontend megjelenítés** - Next.js
- ✅ **Statisztikák** - 24h, 72h, heti
- ✅ **Hibaelhárítás** - Logging és monitoring

## 📞 Támogatás

Problémák esetén:
1. GitHub Actions logok ellenőrzése
2. Adatbázis kapcsolat tesztelése
3. API válaszok ellenőrzése
4. Manuális futtatás tesztelése

---

**Utolsó frissítés**: 2025-07-20
**Verzió**: 2.0.0 