# 🚀 Farcaster Miniapp Demo

Ez egy interaktív Farcaster miniapp demonstráció, amely a [Farcaster dokumentáció](https://docs.farcaster.xyz/) alapján készült. A miniapp egy egyszerű kockadobó játékot tartalmaz, statisztikákat és reward rendszert.

## ✨ Funkciók

- 🎲 **Kockadobó**: Véletlenszerű számok generálása
- 📊 **Statisztikák**: Játékos teljesítmény követése
- 🎁 **Reward Rendszer**: Token és jutalom rendszer
- 🔄 **Interaktív Frame**: Farcaster Frame API integráció
- 📱 **Reszponzív Design**: Mobil és asztali optimalizált

## 🛠️ Technológiai Stack

- **Next.js 14** - React framework App Router-rel
- **TypeScript** - Típusbiztos JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Farcaster Frame API** - Frame interakciók kezelése
- **Vercel** - Deploy platform

## 🚀 Gyors Indítás

### Előfeltételek

- Node.js 18+ 
- npm vagy yarn

### Telepítés

1. **Repository klónozása:**
```bash
git clone <repository-url>
cd farcaster_miniapp
```

2. **Függőségek telepítése:**
```bash
npm install
```

3. **Fejlesztői szerver indítása:**
```bash
npm run dev
```

4. **Böngészőben megnyitás:**
```
http://localhost:3000
```

## 📱 Farcaster Frame Használat

### Frame Tesztelés

1. **Lokális tesztelés:**
   - Indítsd el a fejlesztői szervert
   - Nyisd meg a Frame Validator-t: https://frame-validator.vercel.app/
   - Add meg az URL-t: `http://localhost:3000`

2. **Farcaster-ban tesztelés:**
   - Deploy-old Vercel-re
   - Oszd meg a URL-t egy Farcaster cast-ban
   - A Frame automatikusan megjelenik

### Frame Meta Tag-ek

A miniapp a következő Frame meta tag-eket használja:

```html
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="..." />
<meta property="fc:frame:button:1" content="🎲 Roll Dice" />
<meta property="fc:frame:button:2" content="📊 View Stats" />
<meta property="fc:frame:button:3" content="🎁 Claim Reward" />
<meta property="fc:frame:button:4" content="🔄 Refresh" />
<meta property="fc:frame:post_url" content="..." />
```

## 🏗️ Projekt Struktúra

```
farcaster_miniapp/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── frame/
│   │   │       └── route.ts      # Frame API endpoint
│   │   ├── globals.css           # Globális stílusok
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Főoldal (Frame)
│   └── components/               # React komponensek
├── public/                       # Statikus fájlok
├── package.json                  # Függőségek
├── next.config.ts               # Next.js konfiguráció
├── tailwind.config.ts           # Tailwind konfiguráció
└── README.md                    # Ez a fájl
```

## 🔧 API Endpoints

### Frame API (`/api/frame`)

**POST** - Frame interakciók kezelése
- `buttonIndex`: A megnyomott gomb indexe
- Válasz: Frame konfiguráció JSON formátumban

**GET** - Frame inicializálás
- `action`: Opcionális akció paraméter
- Válasz: Alapértelmezett Frame konfiguráció

## 🎨 Testreszabás

### Színek Módosítása

A Tailwind CSS osztályokat módosíthatod a `src/app/page.tsx` fájlban:

```tsx
// Példa szín módosítás
<div className="bg-gradient-to-br from-purple-600 to-blue-600">
```

### Képek Cseréje

A placeholder képeket lecserélheted saját képekre:

```tsx
// Meta tag-ben
'fc:frame:image': 'https://your-domain.com/your-image.png'
```

### Gombok Módosítása

A Frame gombokat a `src/app/page.tsx` metadata részében módosíthatod:

```tsx
'fc:frame:button:1': '🎲 Roll Dice',
'fc:frame:button:2': '📊 View Stats',
```

## 🚀 Deploy

### Vercel Deploy

1. **GitHub Repository létrehozása:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Vercel Deploy:**
   - Menj a [Vercel](https://vercel.com)-re
   - Import-old a GitHub repository-t
   - Automatikus deploy

3. **Environment Variables:**
   - `NEXT_PUBLIC_BASE_URL`: A deploy-olt URL

### Manuális Deploy

```bash
npm run build
npm start
```

## 🧪 Tesztelés

### Lokális Tesztelés

```bash
# Fejlesztői szerver
npm run dev

# Build tesztelés
npm run build

# Lint ellenőrzés
npm run lint
```

### Frame Validator

Használd a [Frame Validator](https://frame-validator.vercel.app/) eszközt a Frame-ek teszteléséhez.

## 📚 További Források

- [Farcaster Dokumentáció](https://docs.farcaster.xyz/)
- [Frame API Dokumentáció](https://docs.farcaster.xyz/reference/frames)
- [Next.js Dokumentáció](https://nextjs.org/docs)
- [Tailwind CSS Dokumentáció](https://tailwindcss.com/docs)

## 🤝 Közreműködés

1. Fork-old a projektet
2. Hozz létre egy feature branch-et (`git checkout -b feature/amazing-feature`)
3. Commit-old a változtatásaidat (`git commit -m 'Add amazing feature'`)
4. Push-old a branch-et (`git push origin feature/amazing-feature`)
5. Nyiss egy Pull Request-et

## 📄 Licenc

Ez a projekt MIT licenc alatt áll. Lásd a [LICENSE](LICENSE) fájlt részletekért.

## 📞 Kapcsolat

- **GitHub Issues**: [Projekt Issues](https://github.com/your-username/farcaster_miniapp/issues)
- **Email**: your-email@example.com

---

**Készítette a Farcaster közösség számára** 🚀
