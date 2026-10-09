"use client";

import { useActionState } from "react";
import { guardarPerfil, type EstadoPerfil } from "./acciones";

type Datos = { nombre: string | null; dni: string | null; telefono: string | null };

export default function FormPerfil({ datos }: { datos: Datos }) {
  const [estado, accion, pendiente] = useActionState<EstadoPerfil, FormData>(guardarPerfil, {});
  return (
    <form action={accion} className="tarjeta space-y-3">
      <h2 className="font-semibold">Mis datos</h2>
      <p className="text-sm text-slate-500">Los usamos para completar más rápido tus próximas facturas.</p>
      <div>
        <label className="label" htmlFor="nombre">Nombre</label>
        <input id="nombre" name="nombre" className="input" autoComplete="name" defaultValue={datos.nombre ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="dni">DNI</label>
          <input id="dni" name="dni" className="input" inputMode="numeric" defaultValue={datos.dni ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="telefono">WhatsApp</label>
          <input id="telefono" name="telefono" className="input" inputMode="tel" autoComplete="tel" defaultValue={datos.telefono ?? ""} />
        </div>
      </div>
      {estado.error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{estado.error}</p>}
      {estado.ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{estado.ok}</p>}
      <button className="btn-primario w-full" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
