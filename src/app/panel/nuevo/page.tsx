import Link from "next/link";
import { ESTADOS_ABIERTOS, MAX_CASOS_ABIERTOS, PLAZO_RESPUESTA } from "@/lib/datos";
import { requerirUsuario } from "@/lib/supabase/server";
import AvisoBeta from "@/components/aviso-beta";
import FormNuevo from "./form-nuevo";

export const metadata = { title: "Subir factura — TuServicio" };

export default async function Nuevo() {
  const { supabase, user } = await requerirUsuario();
  const [{ data: perfil }, { count }] = await Promise.all([
    supabase.from("perfiles").select("nombre, dni, telefono").eq("id", user.id).single(),
    supabase.from("casos").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("estado", ESTADOS_ABIERTOS),
  ]);

  if ((count ?? 0) >= MAX_CASOS_ABIERTOS)
    return (
      <div className="mx-auto max-w-xl">
        <div className="tarjeta text-center">
          <p className="text-3xl">⏳</p>
          <h1 className="mt-2 text-xl font-bold">Ya tenés {MAX_CASOS_ABIERTOS} facturas en gestión</h1>
          <p className="mt-1 text-slate-600">Cuando terminemos alguna vas a poder subir otra. Así podemos atender bien a todos.</p>
          <Link href="/panel" className="btn-primario mt-4">Ver mis facturas</Link>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Subí tu factura</h1>
      <p className="mb-6 text-slate-600">
        Tarda 2 minutos. Gratis, siempre. Te respondemos en {PLAZO_RESPUESTA}.
      </p>
      <div className="mb-6">
        <AvisoBeta />
      </div>
      <FormNuevo userId={user.id} perfil={perfil ?? { nombre: null, dni: null, telefono: null }} />
    </div>
  );
}
