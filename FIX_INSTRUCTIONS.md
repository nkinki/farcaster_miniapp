# 🚨 KRITIKUS HIBA JAVÍTÁSA - Chess Token Claim

## A probléma
A claim funkció azért nem működik, mert **helytelen signer wallet van beállítva**.

## Azonosított adatok
- **Szerződés signer wallet címe**: `0xe156390D3666a5cd996E0b1b070cd52c4fd15787`
- **Szerződés Chess token egyenlege**: 50,000 CHESS ✅
- **Szerződés ETH egyenlege**: 0 ETH (ez nem probléma, mert a felhasználó fizeti a gas-t)

## Azonnali javítás szükséges

### 1. Állítsd be a helyes BACKEND_WALLET_PRIVATE_KEY-t

A `.env.local` fájlban add hozzá:
```
BACKEND_WALLET_PRIVATE_KEY=0x[A_HELYES_PRIVATE_KEY]
```

**FONTOS**: A private key-nek a `0xe156390D3666a5cd996E0b1b070cd52c4fd15787` címhez kell tartoznia!

### 2. Ellenőrzés

Futtasd le ezt a parancsot az ellenőrzéshez:
```bash
node check_signer_wallet.js
```

Ha minden rendben van, ezt kell látnod:
```
✅ Backend wallet matches signer wallet!
```

### 3. Tesztelés

Ezután a claim funkció működni fog, mert:
- ✅ A signature generálás a helyes private key-jel történik
- ✅ A szerződés el tudja fogadni a signature-t
- ✅ A szerződésnek van elég Chess tokenje (50,000 CHESS)

## Egyéb javítások (már kész)

- ✅ Claim funkció paraméterek javítva (recipient, amount, signature)
- ✅ Gas limit beállítva (200,000 gas)
- ✅ Jobb hibakezelés hozzáadva
- ✅ Debug logok hozzáadva

## Ha még mindig nem működik

1. Ellenőrizd a NEYNAR_API_KEY-t is
2. Ellenőrizd a NEON_DB_URL-t
3. Nézd meg a server console logokat a debug információkért