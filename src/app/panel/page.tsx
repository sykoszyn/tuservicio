import Link from "next/link";
import { ESTADOS, nombreEmpresa, pesos, SERVICIOS, type Estado, type Servicio } from "@/lib/datos";
import { requerirUsuario } from "@/lib/supabase/server";

export const metadata = { title: "Mis facturas — TuServicio" };

export default async function Panel() {
  const { supabase, user } = await requerirUsuario();
  const { data: casos } = await supabase
    .from("casos")
    .select("id, empresa, servicio, estado, monto_actual, monto_nuevo, created_at")
    // Solo las propias: un admin ve las de los demás en /admin.
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ahorroMensual = (casos ?? [])
    .filter((c) => c.estado === "ahorro_conseguido" && c.monto_actual && c.monto_nuevo)
    .reduce((s, c) => s + (c.monto_actual - c.monto_nuevo), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Mis facturas</h1>
        <Link href="/panel/nuevo" className="btn-primario">
          + Subir factura
        </Link>
      </div>

      {ahorroMensual > 0 && (
        <div className="tarjeta bg-emerald-50">
          <p className="text-sm text-emerald-800">Ya estás ahorrando</p>
          <p className="text-3xl font-extrabold text-emerald-700">
            {pesos(ahorroMensual)}<span className="text-base font-medium">/mes</span>
          </p>
          <p className="text-sm text-emerald-800">≈ {pesos(ahorroMensual * 12)} por año</p>
        </div>
      )}

      {!casos?.length ? (
        <div className="tarjeta text-center">
          <p className="mb-4 text-slate-600">Todavía no subiste ninguna factura.</p>
          <Link href="/panel/nuevo" className="btn-primario">
            Subir mi primera factura
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {casos.map((c) => {
            const estado = ESTADOS[c.estado as Estado];
            return (
              <li key={c.id}>
                <Link href={`/panel/caso/${c.id}`} className="tarjeta flex items-center justify-between gap-3 hover:border-emerald-400">
                  <div>
                    <p className="font-semibold">
                      {nombreEmpresa(c.empresa)} · {SERVICIOS[c.servicio as Servicio]}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(c.created_at).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
                      {c.monto_actual ? ` · ${pesos(c.monto_actual)}` : ""}
                      {c.monto_nuevo ? ` → ${pesos(c.monto_nuevo)}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${estado.color}`}>{estado.texto}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
