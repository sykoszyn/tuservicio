"use client";

import { authenticate, ChainId, ClaimKey, isLemonWebView, TransactionResult } from "@lemoncash/mini-app-sdk";

const CHAIN = process.env.NEXT_PUBLIC_LEMON_RED === "polygon" ? ChainId.POLYGON : ChainId.POLYGON_AMOY;

let enLemon: Promise<boolean> | null = null;
/** true si la app está abierta dentro de la app de Lemon (se averigua una vez). */
export function estaEnLemon() {
  return (enLemon ??= isLemonWebView().catch(() => false));
}

export type ResultadoLemon = { ok: true } | { ok: false; cancelado?: boolean; error: string };

let enCurso: Promise<ResultadoLemon> | null = null;
/**
 * Ingreso con Lemon: pide un nonce, Lemon muestra términos y permisos y firma, y el servidor
 * verifica la firma y abre la sesión. Se comparte si se llama varias veces a la vez.
 */
export function ingresarConLemon(): Promise<ResultadoLemon> {
  return (enCurso ??= (async (): Promise<ResultadoLemon> => {
    try {
      const r1 = await fetch("/api/lemon/nonce", { method: "POST" });
      if (!r1.ok) return { ok: false, error: "No pudimos iniciar el ingreso. Probá de nuevo." };
      const { nonce } = await r1.json();

      const auth = await authenticate({
        nonce,
        chainId: CHAIN,
        requirements: { claims: [ClaimKey.NAME, ClaimKey.LAST_NAME, ClaimKey.EMAIL, ClaimKey.LEMONTAG] },
      });
      if (auth.result === TransactionResult.CANCELLED)
        return { ok: false, cancelado: true, error: "Cancelaste el ingreso." };
      if (auth.result !== TransactionResult.SUCCESS)
        return { ok: false, error: "Lemon no pudo verificar tu cuenta. Probá de nuevo." };

      const r2 = await fetch("/api/lemon/ingresar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...auth.data, nonce, claims: auth.data.grantedClaims }),
      });
      if (!r2.ok) {
        const { error } = await r2.json().catch(() => ({ error: null }));
        return { ok: false, error: error ?? "No pudimos iniciar tu sesión." };
      }
      return { ok: true };
    } catch (e) {
      console.error("Ingreso con Lemon:", e);
      return { ok: false, error: "Algo salió mal al ingresar con Lemon." };
    } finally {
      // Permite reintentar si falló.
      setTimeout(() => (enCurso = null), 0);
    }
  })());
}
