# 📧 Email Értesítési Rendszer

Ez a dokumentum leírja, hogyan állítsd be az email értesítéseket a Farcaster Miniapp automatikus frissítési rendszerhez.

## 📋 Áttekintés

Az email értesítési rendszer a következő eseményekkor küld értesítéseket:
- ✅ **Sikeres frissítés** - Minden automatikus frissítés után
- ❌ **Hiba esetén** - Ha valami hiba történik
- 📊 **Napi összefoglaló** - Reggeli frissítés után

## 🛠️ Beállítás

### 1. Gmail App Password Létrehozása

1. Menj a [Google Account beállításokhoz](https://myaccount.google.com/)
2. **Biztonság** → **2 lépcsős ellenőrzés** (bekapcsolva)
3. **App jelszavak** → **Alkalmazás kiválasztása** → **Egyéb**
4. Generálj egy app jelszót (pl. "Farcaster Miniapp")

### 2. Környezeti Változók Beállítása

Hozz létre egy `.env` fájlt vagy állítsd be a GitHub Secrets:

```bash
# Email konfiguráció
EMAIL_SENDER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_RECIPIENT=your-email@gmail.com
```

### 3. GitHub Secrets Beállítása

1. Menj a GitHub repository beállításaihoz
2. **Settings** → **Secrets and variables** → **Actions**
3. Add hozzá a következő secrets:
   - `EMAIL_SENDER`: your-email@gmail.com
   - `EMAIL_PASSWORD`: your-app-password
   - `EMAIL_RECIPIENT`: your-email@gmail.com

## 📧 Email Típusok

### ✅ Sikeres Frissítés
**Küldés:** Minden automatikus frissítés után
**Tartalom:**
- Miniappok száma
- Frissítés időpontja
- Top 5 változás
- Linkek a weboldalhoz

### ❌ Hiba Értesítés
**Küldés:** Ha hiba történik
**Tartalom:**
- Hiba üzenet
- Időpont
- Javaslatok a hibaelhárításhoz

### 📊 Napi Összefoglaló
**Küldés:** Reggeli frissítés után (02:00 UTC)
**Tartalom:**
- Top 10 miniapp táblázat
- Összesített statisztikák
- 72h változások

## 🎨 Email Design

Az emailek HTML formátumban jönnek:
- **Fejléc:** Gradiens háttér, projekt név
- **Tartalom:** Színes kártyák, táblázatok
- **Lábléc:** Automatikus értesítés jelzése

## 🔧 Testelés

### Lokális Teszt
```bash
python email_notifications.py
```

### GitHub Actions Teszt
1. Menj a **Actions** fülre
2. Keresd meg a **Farcaster Miniapp Update Cron** workflow-ot
3. Kattints a **Run workflow** gombra
4. Ellenőrizd az email értesítéseket

## 📱 Mobil Értesítések

### Gmail App
- Telepítsd a Gmail app-ot
- Kapcsold be az értesítéseket
- Az emailek azonnal megjelennek

### Email Szűrők
Hozz létre szűrőket a Gmail-ben:
- **Farcaster Miniapp** címkék
- **Automatikus** mappák
- **Fontos** jelölések

## 🔒 Biztonság

### App Jelszó
- **Ne használd** a normál Gmail jelszót
- **Generálj** külön app jelszót
- **Tartsd biztonságban** a jelszót

### GitHub Secrets
- **Ne commitold** a jelszavakat
- **Használd** a GitHub Secrets-ot
- **Frissítsd** rendszeresen a jelszavakat

## 📊 Példa Email

```
🏆 Farcaster Miniapp Frissítés
2025-07-20 02:00:00

🎉 Sikeres Automatikus Frissítés!

📊 Frissített Adatok:
• Miniappok száma: 246
• Frissítés időpontja: 02:00:00
• Státusz: ✅ Sikeres

📈 Legnagyobb Változások:
• #1 Polling Center
• #2 Degen (+88)
• #3 Ponder (+12)

🔗 Linkek:
• 🌐 Weboldal
• 📁 GitHub
```

## 🚨 Hibaelhárítás

### Email nem jön
1. Ellenőrizd a Gmail spam mappát
2. Nézd meg a GitHub Actions logokat
3. Ellenőrizd az email konfigurációt

### SMTP Hiba
1. Ellenőrizd az app jelszót
2. Kapcsold be a 2 lépcsős ellenőrzést
3. Próbáld újra az app jelszó generálását

### GitHub Actions Hiba
1. Nézd meg a workflow logokat
2. Ellenőrizd a secrets beállításokat
3. Teszteld lokálisan

## 📞 Támogatás

Problémák esetén:
1. GitHub Issues létrehozása
2. Email konfiguráció ellenőrzése
3. Logok megtekintése

---

**Utolsó frissítés**: 2025-07-20
**Verzió**: 1.0.0 