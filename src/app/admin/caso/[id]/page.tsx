import Link from "next/link";
import { notFound } from "next/navigation";
import type { Analisis } from "@/lib/analisis";
import { ESTADOS, nombreEmpresa, pesos, SERVICIOS, type Estado, type Servicio } from "@/lib/datos";
import { requerirAdmin } from "@/lib/supabase/server";
import { actualizarCaso, confirmarAporte } from "../../acciones";

export default async function AdminCaso({ params, searchParams }: PageProps<"/admin/caso/[id]">) {
  const { id } = await params;
  const guardado = (await searchParams).guardado;
  const { supabase } = await requerirAdmin();

  const [{ data: caso }, { data: eventos }, { data: aportes }] = await Promise.all([
    supabase.from("casos").select("*").eq("id", id).single(),
    supabase.from("eventos_caso").select("*").eq("caso_id", id).order("created_at"),
    supabase.from("aportes").select("*").eq("caso_id", id).order("created_at"),
  ]);
  if (!caso) notFound();

  const { data: firmado } = await supabase.storage.from("facturas").createSignedUrl(caso.archivo_path, 600);
  const analisis = caso.analisis as Analisis | null;
  const whatsapp = caso.telefono_contacto?.replace(/\D/g, "");
  const esPdf = caso.archivo_path.endsWith(".pdf");
  const guion =
    analisis?.guion ??
    `Hola, mi nombre es ${caso.titular}, DNI ${caso.dni_titular}, número de cliente ${caso.numero_cliente}.
Llamo porque la factura de ${SERVICIOS[caso.servicio as Servicio].toLowerCase()} subió mucho${caso.monto_actual ? ` (hoy pago ${pesos(caso.monto_actual)})` : ""} y estoy evaluando darme de baja o pasarme a otra empresa.
Antes quería saber qué promoción o plan más económico me pueden ofrecer para quedarme.
¿Me pasás el número de gestión y me confirmás la nueva tarifa por escrito (mail o SMS)?`;

  return (
    <div className="space-y-5">
      <Link href="/admin" className="text-sm text-slate-500">← Volver</Link>
      {guardado && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Guardado.</p>}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="tarjeta space-y-1 text-sm">
          <h1 className="mb-2 text-xl font-bold">{caso.titular}</h1>
          <p><b>Empresa:</b> {nombreEmpresa(caso.empresa)} · {SERVICIOS[caso.servicio as Servicio]}</p>
          <p><b>N° cliente:</b> <span className="select-all font-mono">{caso.numero_cliente}</span></p>
          <p><b>DNI:</b> <span className="select-all font-mono">{caso.dni_titular}</span></p>
          {caso.telefono_contacto && (
            <p>
              <b>WhatsApp:</b> {caso.telefono_contacto}{" "}
              {whatsapp && (
                <a className="text-emerald-700 underline" href={`https://wa.me/54${whatsapp.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer">
                  abrir
                </a>
              )}
            </p>
          )}
          <p><b>Autoriza gestión:</b> {caso.autoriza_gestion ? "Sí" : "No (solo guion)"}</p>
          {firmado?.signedUrl && <a href={firmado.signedUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">Ver factura</a>}
          {caso.error_analisis && <p className="text-rose-700">Error de análisis: {caso.error_analisis}</p>}
        </section>

        <form action={actualizarCaso.bind(null, caso.id)} className="tarjeta space-y-3">
          <div>
            <label className="label" htmlFor="estado">Estado</label>
            <select id="estado" name="estado" defaultValue={caso.estado} className="input">
              {(Object.keys(ESTADOS) as Estado[]).map((e) => <option key={e} value={e}>{ESTADOS[e].texto}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="monto_actual">Monto actual</label>
              <input id="monto_actual" name="monto_actual" className="input" inputMode="decimal" defaultValue={caso.monto_actual ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="monto_nuevo">Monto nuevo</label>
              <input id="monto_nuevo" name="monto_nuevo" className="input" inputMode="decimal" defaultValue={caso.monto_nuevo ?? ""} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="mensaje_operador">Mensaje para el usuario</label>
            <textarea id="mensaje_operador" name="mensaje_operador" rows={3} className="input" defaultValue={caso.mensaje_operador ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="evento">Agregar al historial (opcional)</label>
            <input id="evento" name="evento" className="input" placeholder="Ej: Llamamos a retención, gestión N° 12345" />
          </div>
          <div>
            <label className="label" htmlFor="notas_internas">Notas internas</label>
            <textarea id="notas_internas" name="notas_internas" rows={3} className="input" defaultValue={caso.notas_internas ?? ""} />
          </div>
          <button className="btn-primario w-full">Guardar</button>
        </form>
      </div>

      {firmado?.signedUrl && (
        <section className="tarjeta">
          <h2 className="mb-2 font-semibold">Factura</h2>
          {esPdf ? (
            <iframe src={firmado.signedUrl} className="h-[70vh] w-full rounded-xl border" title="Factura" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firmado.signedUrl} alt="Factura" className="mx-auto max-h-[80vh] rounded-xl border" />
          )}
        </section>
      )}

      <section className="tarjeta text-sm">
        <h2 className="mb-2 font-semibold">Guion para retención</h2>
        <p className="whitespace-pre-line rounded-xl bg-slate-50 p-3">{guion}</p>
      </section>

      {analisis && (
        <section className="tarjeta space-y-3 text-sm">
          <h2 className="text-lg font-bold">Análisis</h2>
          <p>
            Factura: {pesos(analisis.monto_total)} · Plan: {analisis.plan_actual ?? "—"} · Ahorro estimado:{" "}
            {pesos(analisis.ahorro_estimado_mensual)} ({analisis.probabilidad})
          </p>
          {analisis.numero_cliente && analisis.numero_cliente !== caso.numero_cliente && (
            <p className="rounded bg-amber-50 p-2 text-amber-900">⚠️ En la factura figura N° cliente {analisis.numero_cliente}</p>
          )}
          <p>{analisis.resumen}</p>
          <ul className="list-disc pl-5">{analisis.hallazgos.map((h, i) => <li key={i}>{h.detalle}</li>)}</ul>
          <ul className="list-disc pl-5 text-slate-600">
            {analisis.conceptos.map((c, i) => <li key={i}>{c.descripcion}: {pesos(c.monto)}</li>)}
          </ul>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="tarjeta text-sm">
          <h2 className="mb-2 font-semibold">Historial</h2>
          <ul className="space-y-1">
            {eventos?.map((e) => (
              <li key={e.id}>
                <span className="text-slate-400">{new Date(e.created_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span> ·{" "}
                {ESTADOS[e.estado as Estado]?.texto ?? e.estado} — {e.mensaje}
              </li>
            ))}
          </ul>
        </section>
        <section className="tarjeta text-sm">
          <h2 className="mb-2 font-semibold">Aportes voluntarios</h2>
          {!aportes?.length && <p className="text-slate-500">Ninguno (y está bien).</p>}
          <ul className="space-y-2">
            {aportes?.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span>{pesos(a.monto)} · {new Date(a.created_at).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>
                {a.confirmado ? (
                  <span className="text-emerald-700">Confirmado</span>
                ) : (
                  <form action={confirmarAporte.bind(null, a.id, caso.id)}>
                    <button className="text-emerald-700 underline">Confirmar recibido</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
