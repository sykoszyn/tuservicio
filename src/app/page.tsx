import Link from "next/link";
import AvisoBeta from "@/components/aviso-beta";
import { CONTADOR_MINIMO, EMPRESAS, PLAZO_RESPUESTA, pesos } from "@/lib/datos";
import { obtenerEstadisticas } from "@/lib/estadisticas";

const PASOS = [
  { n: "1", t: "Subís tu factura", d: "Foto o PDF, más tu número de cliente y DNI. Tarda 2 minutos." },
  { n: "2", t: "Hablamos con la empresa", d: "Revisamos tu factura y negociamos con el área de retención en tu nombre." },
  { n: "3", t: "Te avisamos", d: `En ${PLAZO_RESPUESTA} tenés novedades en tu cuenta. Nunca cambiamos tu plan sin tu confirmación.` },
];

const numero = (n: number) =>
  new Intl.NumberFormat("es-AR", n >= 10000 ? { notation: "compact", maximumFractionDigits: 1 } : {}).format(n);
const plata = (n: number) =>
  n >= 100000
    ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", notation: "compact", maximumFractionDigits: 1 }).format(n)
    : pesos(n);

export default async function Inicio() {
  const stats = await obtenerEstadisticas().catch(() => null);
  const mostrarStats = stats && stats.personas >= CONTADOR_MINIMO && stats.personas > 0;

  return (
    <div className="space-y-12">
      <section className="pt-6 text-center">
        <p className="mb-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
          100% gratis · sin comisión obligatoria
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Pagá menos de internet, <br className="hidden sm:block" />
          cable y celular
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
          Subís tu factura y te ayudamos a bajarla. No te cobramos nada: si te sirvió y podés, aportás lo que quieras.
          Si no podés, está perfecto.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/panel/nuevo" className="btn-primario text-lg">
            Subir mi factura
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm text-slate-600">
          {Object.entries(EMPRESAS)
            .filter(([k]) => k !== "otra")
            .map(([k, e]) => (
              <span key={k} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {e.nombre}
              </span>
            ))}
        </div>
      </section>

      {mostrarStats && (
        <section className={`grid gap-3 ${stats.ahorroMensual > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
          <div className="tarjeta px-2 text-center sm:px-5">
            <p className="whitespace-nowrap text-2xl font-extrabold text-emerald-700 sm:text-4xl">{numero(stats.personas)}</p>
            <p className="text-sm text-slate-600">{stats.personas === 1 ? "persona registrada" : "personas registradas"}</p>
          </div>
          <div className="tarjeta px-2 text-center sm:px-5">
            <p className="whitespace-nowrap text-2xl font-extrabold text-emerald-700 sm:text-4xl">{numero(stats.facturas)}</p>
            <p className="text-sm text-slate-600">{stats.facturas === 1 ? "factura recibida" : "facturas recibidas"}</p>
          </div>
          {stats.ahorroMensual > 0 && (
            <div className="tarjeta px-2 text-center sm:px-5">
              <p className="whitespace-nowrap text-2xl font-extrabold text-emerald-700 sm:text-4xl">{plata(stats.ahorroMensual)}</p>
              <p className="text-sm text-slate-600">ahorrados por mes</p>
            </div>
          )}
        </section>
      )}

      <AvisoBeta />

      <section className="grid gap-4 sm:grid-cols-3">
        {PASOS.map((p) => (
          <div key={p.n} className="tarjeta">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
              {p.n}
            </div>
            <h3 className="font-semibold">{p.t}</h3>
            <p className="text-sm text-slate-600">{p.d}</p>
          </div>
        ))}
      </section>

      <section className="tarjeta bg-emerald-50 text-center">
        <h2 className="text-xl font-bold">¿Por qué gratis?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-slate-700">
          Si estás buscando bajar tu factura, probablemente no te sobra la plata. Por eso no cobramos un porcentaje
          obligatorio del ahorro. Si lográs pagar menos y querés bancar el proyecto para que ayude a más gente, podés
          hacer un aporte voluntario del monto que quieras.
        </p>
      </section>
    </div>
  );
}
