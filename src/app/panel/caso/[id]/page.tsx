import Link from "next/link";
import { notFound } from "next/navigation";
import { iaHabilitada, type Analisis } from "@/lib/analisis";
import { EMPRESAS, ESTADOS, nombreEmpresa, pesos, SERVICIOS, type Empresa, type Estado, type Servicio } from "@/lib/datos";
import { obtenerConfig } from "@/lib/config";
import { requerirUsuario } from "@/lib/supabase/server";
import { pedirGestion } from "../../acciones";
import { AccionesCaso, AporteVoluntario, AutoAnalizar, Copiar, FormResultado } from "./interactivos";

const TIPO_HALLAZGO: Record<Analisis["hallazgos"][number]["tipo"], string> = {
  aumento: "📈 Aumento",
  promo_vencida: "⏰ Promo vencida",
  cargo_extra: "➕ Cargo extra",
  servicio_no_usado: "🚫 Servicio sin usar",
  equipo_alquilado: "📦 Equipo alquilado",
  otro: "🔎 Otro",
};

export default async function Caso({ params }: PageProps<"/panel/caso/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requerirUsuario();

  const [{ data: caso }, { data: eventos }, { data: aportes }] = await Promise.all([
    supabase.from("casos").select("*").eq("id", id).single(),
    supabase.from("eventos_caso").select("*").eq("caso_id", id).order("created_at"),
    supabase.from("aportes").select("id").eq("caso_id", id).eq("user_id", user.id),
  ]);
  if (!caso) notFound();

  const config = await obtenerConfig();
  const { data: firmado } = await supabase.storage.from("facturas").createSignedUrl(caso.archivo_path, 600);
  const estado = ESTADOS[caso.estado as Estado];
  const analisis = caso.analisis as Analisis | null;
  const ahorro = caso.monto_actual && caso.monto_nuevo ? caso.monto_actual - caso.monto_nuevo : 0;
  const web = EMPRESAS[caso.empresa as Empresa]?.web;
  const abierto = ["analizado", "en_negociacion"].includes(caso.estado);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/panel" className="text-sm text-slate-500 hover:text-slate-800">← Mis facturas</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {nombreEmpresa(caso.empresa)} · {SERVICIOS[caso.servicio as Servicio]}
          </h1>
          <p className="text-sm text-slate-500">
            Cliente N° {caso.numero_cliente} · {caso.titular}
            {firmado?.signedUrl && (
              <>
                {" · "}
                <a href={firmado.signedUrl} target="_blank" rel="noopener noreferrer" className="underline">ver factura</a>
              </>
            )}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${estado.color}`}>{estado.texto}</span>
      </div>

      {iaHabilitada() && <AutoAnalizar id={caso.id} estado={caso.estado} error={caso.error_analisis} />}

      {caso.mensaje_operador && (
        <div className="tarjeta border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Mensaje de nuestro equipo</p>
          <p className="whitespace-pre-line text-amber-900">{caso.mensaje_operador}</p>
        </div>
      )}

      {caso.estado === "ahorro_conseguido" && ahorro > 0 && (
        <div className="tarjeta bg-emerald-50 text-center">
          <p className="text-emerald-800">Pasaste de {pesos(caso.monto_actual)} a {pesos(caso.monto_nuevo)}</p>
          <p className="text-4xl font-extrabold text-emerald-700">
            −{pesos(ahorro)}<span className="text-lg font-medium">/mes</span>
          </p>
          <p className="text-emerald-800">Son {pesos(ahorro * 12)} en un año 🎉</p>
        </div>
      )}

      {caso.estado === "ahorro_conseguido" && ahorro > 0 && (config.mp_alias || config.mp_link) && (
        <section className="tarjeta">
          <h2 className="mb-2 text-lg font-bold">¿Querés bancar el proyecto?</h2>
          <AporteVoluntario
            id={caso.id}
            ahorroMensual={ahorro}
            mpLink={config.mp_link}
            mpAlias={config.mp_alias}
            mpCvu={config.mp_cvu}
            mpTitular={config.mp_titular}
            yaAporto={!!aportes?.length}
          />
        </section>
      )}

      {abierto && (
        <section className="tarjeta space-y-3">
          {caso.estado === "analizado" && (
            <form action={pedirGestion.bind(null, caso.id)}>
              <button className="btn-primario w-full">Gestionalo por mí (gratis)</button>
              <p className="mt-1 text-center text-xs text-slate-500">
                Contactamos a {nombreEmpresa(caso.empresa)} en tu nombre. Te avisamos antes de aceptar cualquier cambio.
              </p>
            </form>
          )}
          {caso.estado === "en_negociacion" && (
            <div className="flex items-start gap-3">
              <span className="text-2xl">📞</span>
              <div>
                <p className="font-semibold">Estamos hablando con {nombreEmpresa(caso.empresa)} por vos</p>
                <p className="text-sm text-slate-600">
                  Te vamos a avisar acá{caso.telefono_contacto ? " y por WhatsApp" : ""}. No cambiamos nada de tu plan sin
                  tu confirmación.
                </p>
              </div>
            </div>
          )}
          {analisis?.legible && <FormResultado id={caso.id} />}
        </section>
      )}

      {analisis && !analisis.legible && (
        <div className="tarjeta border-rose-200 bg-rose-50">
          <p className="text-rose-800">{analisis.resumen}</p>
          <Link href="/panel/nuevo" className="btn-secundario mt-3">Subir otra foto</Link>
        </div>
      )}

      {analisis?.legible && (
        <>
          <section className="tarjeta space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Pagás hoy</p>
                <p className="text-xl font-bold">{pesos(analisis.monto_total)}</p>
                {analisis.periodo && <p className="text-xs text-slate-500">{analisis.periodo}</p>}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Ahorro posible</p>
                <p className="text-xl font-bold text-emerald-700">
                  {analisis.ahorro_estimado_mensual ? `${pesos(analisis.ahorro_estimado_mensual)}/mes` : "—"}
                </p>
                <p className="text-xs text-emerald-700">Probabilidad {analisis.probabilidad}</p>
              </div>
            </div>
            <p className="text-slate-700">{analisis.resumen}</p>
            {analisis.hallazgos.length > 0 && (
              <ul className="space-y-2">
                {analisis.hallazgos.map((h, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <span className="font-semibold">{TIPO_HALLAZGO[h.tipo]}</span>
                    {h.impacto_mensual ? <span className="text-slate-500"> · {pesos(h.impacto_mensual)}/mes</span> : null}
                    <p className="text-slate-600">{h.detalle}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <details className="tarjeta" open={caso.estado === "analizado"}>
            <summary className="cursor-pointer text-lg font-bold">Hacelo vos: guion para llamar o chatear</summary>
            <div className="mt-3 space-y-4">
              <ol className="list-decimal space-y-1 pl-5 text-slate-700">
                {analisis.pasos.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-600">Guion</p>
                  <Copiar texto={analisis.guion} />
                </div>
                <p className="whitespace-pre-line text-slate-800">{analisis.guion}</p>
              </div>
              {web && (
                <a href={web} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 underline">
                  Ir a la web de {nombreEmpresa(caso.empresa)}
                </a>
              )}
            </div>
          </details>
        </>
      )}

      {!!eventos?.length && (
        <section className="tarjeta">
          <h2 className="mb-3 font-semibold">Historial</h2>
          <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
            {eventos.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full bg-emerald-500" />
                <p className="text-sm">{e.mensaje}</p>
                <p className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {["recibido", "analizado", "en_negociacion"].includes(caso.estado) && (
        <AccionesCaso
          caso={{
            id: caso.id,
            empresa: caso.empresa,
            servicio: caso.servicio,
            numero_cliente: caso.numero_cliente,
            dni_titular: caso.dni_titular,
            titular: caso.titular,
            telefono_contacto: caso.telefono_contacto,
          }}
        />
      )}
    </div>
  );
}
