"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { EMPRESAS, pesos, SERVICIOS, type Empresa, type Servicio } from "@/lib/datos";
import { cancelarCaso, declararAporte, editarCaso, informarResultado } from "../../acciones";

/** Dispara el análisis si hace falta y refresca la página mientras corre. */
export function AutoAnalizar({ id, estado, error }: { id: string; estado: string; error: string | null }) {
  const router = useRouter();
  const disparado = useRef(false);
  const [falla, setFalla] = useState(error);
  const [cargando, setCargando] = useState(false);

  async function analizar() {
    setCargando(true);
    setFalla(null);
    const r = await fetch(`/api/casos/${id}/analizar`, { method: "POST" });
    if (!r.ok) setFalla((await r.json().catch(() => ({}))).error ?? "No se pudo analizar.");
    setCargando(false);
    router.refresh();
  }

  useEffect(() => {
    if (estado === "recibido" && !error && !disparado.current) {
      disparado.current = true;
      analizar();
    }
    if (estado === "analizando") {
      const t = setInterval(() => router.refresh(), 3000);
      return () => clearInterval(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, error]);

  if (falla && !cargando)
    return (
      <div className="tarjeta border-rose-200 bg-rose-50">
        <p className="mb-3 text-rose-800">{falla}</p>
        <button className="btn-secundario" onClick={analizar}>Reintentar</button>
      </div>
    );

  if (cargando || estado === "recibido" || estado === "analizando")
    return (
      <div className="tarjeta flex items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <div>
          <p className="font-semibold">Estamos leyendo tu factura…</p>
          <p className="text-sm text-slate-500">Suele tardar menos de un minuto. Podés cerrar esta pantalla.</p>
        </div>
      </div>
    );

  return null;
}

export function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="btn-secundario px-3 py-2 text-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
    >
      {ok ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

export function FormResultado({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, start] = useTransition();
  if (!abierto)
    return (
      <button className="btn-secundario w-full" onClick={() => setAbierto(true)}>
        Ya llamé yo, contar cómo me fue
      </button>
    );
  return (
    <form
      className="space-y-3 rounded-xl bg-slate-50 p-4"
      action={(f) => start(() => informarResultado(id, Number(f.get("monto")) || null))}
    >
      <label className="label" htmlFor="monto">¿Cuánto vas a pagar ahora por mes?</label>
      <input id="monto" name="monto" className="input" inputMode="decimal" placeholder="Dejalo vacío si no te bajaron" />
      <button className="btn-primario w-full" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}

export function AporteVoluntario({
  id,
  ahorroMensual,
  mpLink,
  mpAlias,
  mpCvu,
  mpTitular,
  yaAporto,
}: {
  id: string;
  ahorroMensual: number;
  mpLink: string | null;
  mpAlias: string | null;
  mpCvu: string | null;
  mpTitular: string | null;
  yaAporto: boolean;
}) {
  const [respuesta, setRespuesta] = useState<"" | "aporte" | "no">(yaAporto ? "aporte" : "");
  const [monto, setMonto] = useState("");
  const [pendiente, start] = useTransition();
  const sugeridos = [0.05, 0.1, 0.2].map((p) => Math.max(500, Math.round((ahorroMensual * p) / 100) * 100));

  if (respuesta === "aporte")
    return <p className="text-emerald-800">¡Gracias por bancar el proyecto! Así podemos ayudar a más gente. 💚</p>;
  if (respuesta === "no")
    return <p className="text-slate-700">¡Perfecto! Disfrutá el ahorro. Si algún día podés, acá vamos a estar. 💚</p>;

  return (
    <div className="space-y-4">
      <p className="text-slate-700">
        Esto es <strong>totalmente opcional</strong>. Si te sirvió y podés, un aporte nos ayuda a seguir siendo gratis
        para todos. Si no podés, no pasa nada.
      </p>
      <div className="flex flex-wrap gap-2">
        {sugeridos.map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-medium ${monto === String(s) ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}
            onClick={() => setMonto(String(s))}
          >
            {pesos(s)}
          </button>
        ))}
        <input
          className="input w-36 py-2"
          inputMode="numeric"
          placeholder="Otro monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {mpAlias && (
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <p className="mb-2 text-slate-600">Transferí desde cualquier banco o billetera:</p>
          <div className="flex items-center justify-between gap-2">
            <p>
              Alias: <strong className="select-all text-base">{mpAlias}</strong>
            </p>
            <Copiar texto={mpAlias} />
          </div>
          {mpCvu && (
            <p className="mt-1">
              CVU: <span className="select-all font-mono">{mpCvu}</span>
            </p>
          )}
          {mpTitular && <p className="mt-1 text-slate-500">A nombre de {mpTitular}</p>}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {mpLink && (
          <a href={mpLink} target="_blank" rel="noopener noreferrer" className="btn-primario">
            Aportar con Mercado Pago
          </a>
        )}
        <button
          className="btn-secundario"
          disabled={!Number(monto) || pendiente}
          onClick={() =>
            start(async () => {
              await declararAporte(id, Number(monto));
              setRespuesta("aporte");
            })
          }
        >
          Ya aporté {Number(monto) ? pesos(Number(monto)) : ""}
        </button>
        <button className="btn px-3 text-slate-500 hover:text-slate-800" onClick={() => setRespuesta("no")}>
          Ahora no puedo
        </button>
      </div>
    </div>
  );
}

type DatosCaso = {
  id: string;
  empresa: Empresa;
  servicio: Servicio;
  numero_cliente: string;
  dni_titular: string;
  titular: string;
  telefono_contacto: string | null;
};

/** Corregir datos o cancelar y borrar el caso. */
export function AccionesCaso({ caso }: { caso: DatosCaso }) {
  const router = useRouter();
  const [modo, setModo] = useState<"" | "editar" | "cancelar">("");
  const [empresa, setEmpresa] = useState<Empresa>(caso.empresa);
  const [error, setError] = useState("");
  const [pendiente, start] = useTransition();

  function cerrar() {
    setModo("");
    setError("");
  }

  return (
    <section className="tarjeta">
      {modo !== "editar" ? (
        <>
          <p className="font-semibold">¿Te equivocaste en algo?</p>
          <p className="mb-4 text-sm text-slate-500">Podés corregir los datos o cancelar el pedido. Es gratis y no afecta tu servicio.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-secundario" onClick={() => setModo("editar")}>
              ✏️ Corregir datos
            </button>
            <button
              type="button"
              className="btn border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
              onClick={() => setModo("cancelar")}
            >
              🗑️ Cancelar pedido
            </button>
          </div>
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setError("");
            start(async () => {
              const r = await editarCaso(caso.id, {
                empresa,
                servicio: String(f.get("servicio")) as Servicio,
                numero_cliente: String(f.get("numero_cliente")),
                dni_titular: String(f.get("dni_titular")),
                titular: String(f.get("titular")),
                telefono_contacto: String(f.get("telefono_contacto") ?? ""),
              });
              if (r.error) return setError(r.error);
              cerrar();
              router.refresh();
            });
          }}
        >
          <p className="font-semibold">Corregir datos</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="e-empresa">Empresa</label>
              <select id="e-empresa" className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value as Empresa)}>
                {(Object.keys(EMPRESAS) as Empresa[]).map((k) => (
                  <option key={k} value={k}>{EMPRESAS[k].nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="e-servicio">Servicio</label>
              <select key={empresa} id="e-servicio" name="servicio" className="input" defaultValue={caso.servicio}>
                {EMPRESAS[empresa].servicios.map((sv) => (
                  <option key={sv} value={sv}>{SERVICIOS[sv]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="e-numero">Número de cliente</label>
            <input id="e-numero" name="numero_cliente" className="input" defaultValue={caso.numero_cliente} maxLength={40} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="e-dni">DNI del titular</label>
              <input id="e-dni" name="dni_titular" className="input" inputMode="numeric" defaultValue={caso.dni_titular} required />
            </div>
            <div>
              <label className="label" htmlFor="e-titular">Nombre del titular</label>
              <input id="e-titular" name="titular" className="input" defaultValue={caso.titular} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="e-tel">WhatsApp</label>
            <input id="e-tel" name="telefono_contacto" className="input" inputMode="tel" defaultValue={caso.telefono_contacto ?? ""} />
          </div>
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-secundario" onClick={cerrar} disabled={pendiente}>Volver</button>
            <button className="btn-primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
          </div>
          <p className="text-xs text-slate-500">¿Subiste otra factura por error? Cancelá el pedido y cargalo de nuevo.</p>
        </form>
      )}

      {modo === "cancelar" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
          onClick={() => !pendiente && cerrar()}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-2xl">🗑️</div>
            <h3 className="text-center text-lg font-bold">¿Cancelar este pedido?</h3>
            <p className="mt-1 text-center text-sm text-slate-600">
              Vamos a borrar la factura y los datos que cargaste. Si querés, después podés subirla de nuevo.
            </p>
            {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                className="btn bg-rose-600 text-white hover:bg-rose-700"
                disabled={pendiente}
                onClick={() =>
                  start(async () => {
                    const r = await cancelarCaso(caso.id);
                    if (r.error) return setError(r.error);
                    router.push("/panel");
                    router.refresh();
                  })
                }
              >
                {pendiente ? "Cancelando…" : "Sí, cancelar y borrar"}
              </button>
              <button type="button" className="btn-secundario" onClick={cerrar} disabled={pendiente}>
                No, volver
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
