import Link from "next/link";
import { pesos } from "@/lib/datos";
import { requerirUsuario } from "@/lib/supabase/server";
import FormPerfil from "./form-perfil";

export const metadata = { title: "Mi perfil — TuServicio" };

const PROVEEDOR: Record<string, string> = { google: "Google", email: "Email y contraseña" };

export default async function MiPerfil() {
  const { supabase, user } = await requerirUsuario();
  const [{ data: perfil }, { data: casos }] = await Promise.all([
    supabase.from("perfiles").select("nombre, dni, telefono, es_admin").eq("id", user.id).maybeSingle(),
    supabase.from("casos").select("estado, monto_actual, monto_nuevo").eq("user_id", user.id),
  ]);

  const proveedores = ((user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider ?? "email"])
    .map((p) => PROVEEDOR[p] ?? p)
    .join(" · ");
  const ahorro = (casos ?? [])
    .filter((c) => c.estado === "ahorro_conseguido" && c.monto_actual && c.monto_nuevo)
    .reduce((s, c) => s + (c.monto_actual - c.monto_nuevo), 0);
  const foto = user.user_metadata?.avatar_url as string | undefined;
  const nombre = perfil?.nombre || user.email;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Mi perfil</h1>

      <section className="tarjeta flex items-center gap-4">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="h-14 w-14 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white">
            {(nombre ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{nombre}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                perfil?.es_admin ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {perfil?.es_admin ? "Administrador" : "Usuario"}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Ingresás con {proveedores}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/panel" className="tarjeta hover:border-emerald-400">
          <p className="text-xs text-slate-500">Mis facturas</p>
          <p className="text-2xl font-bold">{casos?.length ?? 0}</p>
          <p className="text-sm text-emerald-700">Ver todas →</p>
        </Link>
        <div className="tarjeta">
          <p className="text-xs text-slate-500">Ahorro por mes</p>
          <p className="text-2xl font-bold text-emerald-700">{pesos(ahorro)}</p>
          <p className="text-sm text-slate-500">{ahorro ? `${pesos(ahorro * 12)} al año` : "Todavía nada"}</p>
        </div>
      </div>

      {perfil?.es_admin && (
        <Link href="/admin" className="tarjeta flex items-center justify-between border-amber-200 bg-amber-50 hover:border-amber-400">
          <span>
            <span className="block font-semibold text-amber-900">🛠️ Panel de gestión</span>
            <span className="text-sm text-amber-800">Casos, aportes y configuración</span>
          </span>
          <span className="text-amber-800">→</span>
        </Link>
      )}

      <FormPerfil datos={{ nombre: perfil?.nombre ?? null, dni: perfil?.dni ?? null, telefono: perfil?.telefono ?? null }} />

      <form action="/auth/salir" method="post">
        <button className="btn w-full border border-rose-200 bg-white text-rose-700 hover:bg-rose-50">Cerrar sesión</button>
      </form>
    </div>
  );
}
