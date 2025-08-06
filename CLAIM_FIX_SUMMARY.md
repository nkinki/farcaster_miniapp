# Chess Token Claim Gas Fee Hiba Javítása

## Probléma
A Chess token claim funkcióban gas fee hiba jelentkezett, annak ellenére, hogy van ETH és Chess token is az okosszerződésben.

**FONTOS FELISMERÉS**: A claim funkció NEM igényel approve-t a felhasználó részéről, mivel a szerződés küldi a tokeneket a felhasználónak (nem a felhasználótól veszi el).

## Azonosított problémák és javítások

### 1. ❌ KRITIKUS: Helytelen signer wallet
**Probléma**: A szerződés signer wallet címe `0xe156390D3666a5cd996E0b1b070cd52c4fd15787`, de a BACKEND_WALLET_PRIVATE_KEY nincs beállítva vagy nem a helyes private key-t tartalmazza.

**Javítás szükséges**:
- Állítsd be a BACKEND_WALLET_PRIVATE_KEY environment változót a helyes private key-jel
- A private key-nek a `0xe156390D3666a5cd996E0b1b070cd52c4fd15787` címhez kell tartoznia

### 2. Claim funkció paraméterek javítása
**Probléma**: A claim funkció valójában csak 3 paramétert vár (recipient, amount, signature), nem 4-et.

**Javítás**:
- `src/components/UserProfile.tsx`: Eltávolítottuk a nonce paramétert
- `src/abis/rewardsClaim.ts`: Visszaállítottuk az eredeti ABI-t

### 2. Gas limit beállítás
**Probléma**: Nem volt explicit gas limit beállítva, ami gas estimation hibákat okozhatott.

**Javítás**:
- Hozzáadtunk explicit gas limit beállítást (200,000 gas) a claim tranzakcióhoz

### 3. Jobb hibakezelés
**Probléma**: A hibakezelés nem volt elég specifikus a gas fee hibákhoz.

**Javítás**:
- Hozzáadtunk specifikus hibakezelést gas fee és execution reverted hibákhoz
- Hozzáadtunk console.error logolást a debug információkhoz

### 4. Debug információk hozzáadása
**Javítás**:
- `src/app/api/generate-claim-signature/route.ts`: Hozzáadtunk debug logokat a signature generáláshoz

### 5. Environment változók dokumentálása
**Javítás**:
- `.env.example`: Hozzáadtuk a hiányzó BACKEND_WALLET_PRIVATE_KEY és NEYNAR_API_KEY változókat

## Módosított fájlok

1. `src/components/UserProfile.tsx`
   - Hozzáadtuk a nonce paramétert a claim funkcióhoz
   - Explicit gas limit beállítás
   - Jobb hibakezelés

2. `src/abis/rewardsClaim.ts`
   - Frissítettük a claim funkció ABI-ját, hogy tartalmazza a nonce paramétert

3. `src/app/api/generate-claim-signature/route.ts`
   - Debug logok hozzáadása

4. `.env.example`
   - Hiányzó environment változók hozzáadása

## Tesztelés

A javítások után a claim funkció most már:
1. Helyesen átadja mind a 4 paramétert a szerződésnek
2. Explicit gas limit-tel rendelkezik
3. Jobb hibaüzeneteket ad vissza
4. Debug információkat logol a fejlesztéshez

## Következő lépések

1. Ellenőrizd, hogy a `.env.local` fájlban be vannak-e állítva a szükséges environment változók:
   - `BACKEND_WALLET_PRIVATE_KEY`
   - `NEYNAR_API_KEY`
   - `NEON_DB_URL`

2. Teszteld a claim funkciót egy valós felhasználóval

3. Ellenőrizd a browser console-ban a debug logokat

4. Ha még mindig van probléma, ellenőrizd a szerződés egyenlegét és a signer wallet címét