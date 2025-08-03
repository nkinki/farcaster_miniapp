// CSERÉLD KI EZEKET A HELYES CÍMEKRE A BASE HÁLÓZATON!
export const PROMO_CONTRACT_ADDRESS = '0x439f17d5b1b1076c04f9a1d36a3a5df3346ddb98'; // A FarcasterPromo contractod címe
export const CHESS_TOKEN_ADDRESS = '0x47AF6bd390D03E266EB87cAb81Aa6988B65d5B07';    // A CHESS token contract címe

// Importáld az ABI-kat a JSON fájlokból
import FarcasterPromoAbi from '@/abis/FarcasterPromo.json';
import ChessTokenAbi from '@/abis/ChessToken.json';

export const PROMO_CONTRACT_ABI = FarcasterPromoAbi;
export const CHESS_TOKEN_ABI = ChessTokenAbi;