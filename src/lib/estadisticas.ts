import { unstable_cache } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/server";

export type Estadisticas = { personas: number; facturas: number; ahorroMensual: number };

/** Totales públicos (sin datos personales). Se recalculan cada 5 minutos. */
export const obtenerEstadisticas = unstable_cache(
  async (): Promise<Estadisticas> => {
    const admin = crearClienteAdmin();
    const [personas, facturas, logrados] = await Promise.all([
      admin.from("perfiles").select("id", { count: "exact", head: true }),
      admin.from("casos").select("id", { count: "exact", head: true }).neq("estado", "cancelado"),
      admin.from("casos").select("monto_actual, monto_nuevo").eq("estado", "ahorro_conseguido"),
    ]);
    const ahorroMensual = (logrados.data ?? []).reduce(
      (s, c) => s + Math.max(0, Number(c.monto_actual ?? 0) - Number(c.monto_nuevo ?? 0)),
      0,
    );
    return { personas: personas.count ?? 0, facturas: facturas.count ?? 0, ahorroMensual };
  },
  ["estadisticas-publicas"],
  { revalidate: 300 },
);
