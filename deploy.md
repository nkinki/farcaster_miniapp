# 🚀 Deploy Instructions

## GitHub Repository Létrehozása

1. **GitHub-on hozz létre egy új repository-t**
   - Menj a [GitHub](https://github.com)-ra
   - Kattints a "New repository" gombra
   - Add meg a nevet: `farcaster_miniapp`
   - Válaszd ki a "Public" opciót
   - Kattints a "Create repository" gombra

2. **Lokális repository inicializálása**
```bash
cd farcaster_miniapp
git init
git add .
git commit -m "Initial commit: Farcaster miniapp tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/farcaster_miniapp.git
git push -u origin main
```

## Vercel Deploy

1. **Vercel fiók létrehozása**
   - Menj a [Vercel](https://vercel.com)-re
   - Regisztrálj GitHub fiókkal

2. **Projekt importálása**
   - Kattints a "New Project" gombra
   - Válaszd ki a `farcaster_miniapp` repository-t
   - Kattints a "Import" gombra

3. **Konfiguráció**
   - **Framework Preset**: Next.js (automatikusan felismeri)
   - **Root Directory**: `./` (alapértelmezett)
   - **Build Command**: `npm run build` (alapértelmezett)
   - **Output Directory**: `.next` (alapértelmezett)

4. **Environment Variables**
   - **Nincs szükség környezeti változókra!**
   - A projekt a `top_miniapps.json` fájlt használja
   - Nincs szükség API kulcsokra vagy Bearer tokenekre

5. **Deploy**
   - Kattints a "Deploy" gombra
   - Várj, amíg befejeződik a build

## Frame Tesztelés

1. **Frame Validator**
   - Menj a [Frame Validator](https://frame-validator.vercel.app/)-ra
   - Add meg a deploy-olt URL-t
   - Ellenőrizd, hogy minden meta tag helyesen van beállítva

2. **Farcaster Tesztelés**
   - Oszd meg a URL-t egy Farcaster cast-ban
   - Ellenőrizd, hogy a Frame megjelenik
   - Teszteld a gombokat

## Domain Beállítás (Opcionális)

1. **Custom Domain**
   - A Vercel projekt beállításaiban
   - Kattints a "Domains" fülre
   - Add hozzá a saját domain-edet

2. **DNS Beállítás**
   - Add hozzá a Vercel által megadott DNS rekordokat
   - Várj, amíg propagálódik (max 24 óra)

## Monitoring

1. **Vercel Analytics**
   - Kapcsold be a Vercel Analytics-t
   - Kövesd a látogatókat és teljesítményt

2. **Error Tracking**
   - Használj Sentry vagy hasonló eszközt
   - Kövesd a hibákat és teljesítményt

## Frissítések

1. **Kód módosítása**
```bash
# Lokális módosítások
git add .
git commit -m "Update: description of changes"
git push origin main
```

2. **Automatikus Deploy**
   - A Vercel automatikusan újra deploy-ol
   - A változtatások azonnal elérhetőek

3. **Adatok frissítése**
   - A `top_miniapps.json` fájl frissítése
   - GitHub Actions automatikusan frissíti naponta 2x
   - Nincs szükség manuális beavatkozásra

## Troubleshooting

### Build Hibák
- Ellenőrizd a console logokat
- Győződj meg róla, hogy minden függőség telepítve van
- Teszteld lokálisan: `npm run build`

### Frame Nem Jelenik Meg
- Ellenőrizd a meta tag-eket
- Használd a Frame Validator-t
- Győződj meg róla, hogy a URL elérhető

### API Hibák
- Ellenőrizd a Vercel function logokat
- Teszteld a `/api/miniapps` endpoint-ot
- Győződj meg róla, hogy a `top_miniapps.json` fájl létezik

### Cron Job Hibák
- Ellenőrizd a GitHub Actions logokat
- Teszteld a `/api/cron/update` endpoint-ot
- Győződj meg róla, hogy a test token működik

## Hasznos Linkek

- [Vercel Dokumentáció](https://vercel.com/docs)
- [Next.js Deploy](https://nextjs.org/docs/app/building-your-application/deploying)
- [Frame Validator](https://frame-validator.vercel.app/)
- [Farcaster Dokumentáció](https://docs.farcaster.xyz/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Sikeres deploy után a miniapp elérhető lesz a Farcaster közösség számára!** 🎉

**Előnyök a tiszta verzióval:**
- ✅ Nincs szükség API kulcsokra
- ✅ Nincs szükség Bearer tokenekre
- ✅ Egyszerű deployment
- ✅ Automatikus frissítések
- ✅ Megbízható működés 