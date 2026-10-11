import { polygon, polygonAmoy } from "viem/chains";

/**
 * Red de Lemon. Mientras la Mini App está en desarrollo usa testnet (Polygon Amoy).
 * Al publicarla, poné NEXT_PUBLIC_LEMON_RED=polygon en Vercel.
 */
export const LEMON_MAINNET = process.env.NEXT_PUBLIC_LEMON_RED === "polygon";
export const LEMON_CHAIN = LEMON_MAINNET ? polygon : polygonAmoy;
