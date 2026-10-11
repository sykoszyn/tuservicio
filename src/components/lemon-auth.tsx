"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { estaEnLemon, ingresarConLemon } from "@/lib/lemon-cliente";

/**
 * Dentro de la app de Lemon, autentica al entrar (Lemon lo exige en cada apertura de la Mini App).
 * Fuera de Lemon no hace nada.
 */
export default function LemonAuth() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!(await estaEnLemon())) return;
      try {
        if (sessionStorage.getItem("lemon-auth") === "ok") return;
      } catch {}
      // En /login el formulario maneja el ingreso (y los reintentos).
      if (pathname === "/login") return;
      const r = await ingresarConLemon();
      if (cancelado || !r.ok) return;
      try {
        sessionStorage.setItem("lemon-auth", "ok");
      } catch {}
      router.refresh();
    })();
    return () => {
      cancelado = true;
    };
    // Solo al abrir la Mini App.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
