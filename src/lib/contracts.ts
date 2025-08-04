// CSERÉLD KI EZEKET A HELYES CÍMEKRE A BASE HÁLÓZATON!
export const PROMO_CONTRACT_ADDRESS = '0x6d41927f5707965017be491d98b28a3c2a52164f'; // A FarcasterPromo contractod címe
export const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';    // A CHESS token contract címe

// Importáld az ABI-kat a JSON fájlokból
import FarcasterPromoAbi from '@/abis/FarcasterPromo.json';
import ChessTokenAbi from '@/abis/ChessToken.json';

export const PROMO_CONTRACT_ABI = FarcasterPromoAbi;
export const CHESS_TOKEN_ABI = ChessTokenAbi;