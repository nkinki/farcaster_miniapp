// Fájl: /src/lib/contracts.ts

// Itt csak a központilag használt, releváns szerződés címeket tároljuk.
// Az ABI-kat a komponensek és hook-ok közvetlenül az /abis mappából importálják.

// A CHESS token szerződésének címe
export const CHESS_TOKEN_ADDRESS_CONST = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';

// Az ÚJ befizetési szerződés címe
export const TREASURY_DEPOSIT_ADDRESS_CONST = '0x6d1d60bbed4d75768db63761dc498c56e5e5bc6b';

// Opcionális: Ha valahol a kódban még szükséged van a régi promóciós szerződés címére
// (pl. a régi jutalmak lekérdezéséhez), akkor hagyd meg, de nevezd át egyértelműen.
export const OLD_PROMO_CONTRACT_ADDRESS_CONST = '0xeca8a11700476863a976b841dc32e351acf6ed1f';


// Készítünk egy könnyen használható objektumot a címekhez,
// amit a hook-ok és komponensek használhatnak.
export const CONTRACTS = {
  CHESS_TOKEN: CHESS_TOKEN_ADDRESS_CONST,
  TreasuryDeposit: TREASURY_DEPOSIT_ADDRESS_CONST,
  
  // A FarcasterPromo-t átnevezzük, hogy jelezzük, ez a régi rendszer.
  // Csak akkor hagyd benne, ha a claim logika még használja a régi szerződést.
  FarcasterPromo_OLD: OLD_PROMO_CONTRACT_ADDRESS_CONST, 
} as const;