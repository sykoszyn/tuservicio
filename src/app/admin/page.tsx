import Link from "next/link";
import { ESTADOS, nombreEmpresa, pesos, SERVICIOS, type Estado, type Servicio } from "@/lib/datos";
import { requerirAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Admin — TuServicio" };

const FILTROS: (Estado | "todos")[] = ["en_negociacion", "analizado", "recibido", "ahorro_conseguido", "sin_ahorro", "todos"];

export default async function Admin({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requerirAdmin();
  const filtro = ((await searchParams).estado as string) ?? "en_negociacion";

  let q = supabase
    .from("casos")
    .select("id, empresa, servicio, titular, estado, autoriza_gestion, monto_actual, monto_nuevo, created_at")
    .order("created_at", { ascending: true })
    .limit(200);
  if (filtro !== "todos") q = q.eq("estado", filtro);

  const [{ data: casos }, { data: logrados }, { data: aportes }] = await Promise.all([
    q,
    supabase.from("casos").select("monto_actual, monto_nuevo").eq("estado", "ahorro_conseguido"),
    supabase.from("aportes").select("monto").eq("confirmado", true),
  ]);

  const ahorroTotal = (logrados ?? []).reduce((s, c) => s + ((c.monto_actual ?? 0) - (c.monto_nuevo ?? 0)), 0);
  const aportesTotal = (aportes ?? []).reduce((s, a) => s + Number(a.monto), 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Panel de gestión</h1>
      <div className="grid grid-cols-3 gap-3">
        <div className="tarjeta"><p className="text-xs text-slate-500">Facturas bajadas</p><p className="text-2xl font-bold">{logrados?.length ?? 0}</p></div>
        <div className="tarjeta"><p className="text-xs text-slate-500">Ahorro generado/mes</p><p className="text-2xl font-bold">{pesos(ahorroTotal)}</p></div>
        <div className="tarjeta"><p className="text-xs text-slate-500">Aportes confirmados</p><p className="text-2xl font-bold">{pesos(aportesTotal)}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f}
            href={`/admin?estado=${f}`}
            className={`rounded-full border px-3 py-1 text-sm ${filtro === f ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}
          >
            {f === "todos" ? "Todos" : ESTADOS[f].texto}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="p-3">Fecha</th><th className="p-3">Titular</th><th className="p-3">Empresa</th><th className="p-3">Monto</th><th className="p-3">Estado</th></tr>
          </thead>
          <tbody>
            {casos?.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-3 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString("es-AR")}</td>
                <td className="p-3"><Link href={`/admin/caso/${c.id}`} className="font-medium text-emerald-700 underline">{c.titular}</Link>{c.autoriza_gestion && " ✋"}</td>
                <td className="p-3">{nombreEmpresa(c.empresa)} · {SERVICIOS[c.servicio as Servicio]}</td>
                <td className="p-3 whitespace-nowrap">{pesos(c.monto_actual)}{c.monto_nuevo ? ` → ${pesos(c.monto_nuevo)}` : ""}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${ESTADOS[c.estado as Estado].color}`}>{ESTADOS[c.estado as Estado].texto}</span></td>
              </tr>
            ))}
            {!casos?.length && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No hay casos en este estado.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">✋ = autorizó a gestionar en su nombre.</p>
    </div>
  );
}
