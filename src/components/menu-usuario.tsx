"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = { email: string; nombre: string | null; esAdmin: boolean; foto: string | null };

export default function MenuUsuario({ email, nombre, esAdmin, foto }: Props) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAbierto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  const inicial = (nombre || email).trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-label="Abrir menú de perfil"
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-medium hover:bg-slate-50"
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">{inicial}</span>
        )}
        {esAdmin && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Admin</span>}
        <span className="text-slate-400">▾</span>
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            {nombre && <p className="truncate font-semibold">{nombre}</p>}
            <p className="truncate text-sm text-slate-500">{email}</p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                esAdmin ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {esAdmin ? "Administrador" : "Usuario"}
            </span>
          </div>
          <nav className="py-1 text-sm">
            <Link href="/panel/perfil" className="block px-4 py-2.5 hover:bg-slate-50">👤 Mi perfil</Link>
            <Link href="/panel" className="block px-4 py-2.5 hover:bg-slate-50">📄 Mis facturas</Link>
            {esAdmin && (
              <>
                <Link href="/admin" className="block px-4 py-2.5 hover:bg-slate-50">🛠️ Panel de gestión</Link>
                <Link href="/admin/configuracion" className="block px-4 py-2.5 hover:bg-slate-50">⚙️ Configuración</Link>
              </>
            )}
          </nav>
          <form action="/auth/salir" method="post" className="border-t border-slate-100">
            <button className="w-full px-4 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50">↩︎ Cerrar sesión</button>
          </form>
        </div>
      )}
    </div>
  );
}
